#!/usr/bin/env python3
"""
Fuse the CAD and the boards into one model of a building.

    python3 tools/fuse_building.py M4        # -> m4-data.js
    python3 tools/fuse_building.py M3        # -> m3-data.js

Neither source is enough alone. The CAD has exact walls, doors and the true
envelope, but no room identity and stray linework that splits big rooms. The
boards have clean rooms and real names, but are photographs and miss every
corridor. Registered onto each other:

  * envelope, walls, doors  <- CAD
  * rooms, names, codes     <- boards
  * corridor                <- envelope MINUS rooms, which is Evan's point:
                               nobody has to draw or detect it
  * level 1 envelope        <- the ground floor's, because the structural shell
                               repeats vertically and there is no L1 CAD
"""
import json, sys
import numpy as np, cv2

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from extract_floorplan import load, parse, classify, building_layers

M_PER_UNIT = 0.1177
FLOOR_H, WALL_H = 4.0, 3.2
SLIVER_M2 = 4.0     # below this an unnamed, non-stair blob is wall, not a room

# Read off the boards, index by index, against the rendered overlays.
# Two of Evan's corrections are baked in: the board's "Copy/Print Centre" is
# really the Music Room, and "Caseroom 2" is Classroom 8 (so Caseroom 1 is 7).
# Ground floor now comes from a redrawn version of the board -- same plan with
# the fire-safety icons and route arrows stripped and the photo's perspective
# gone. It is a regeneration, so it was checked rather than trusted: it
# registers against the CAD at IoU 0.955 versus the photograph's 0.958, both at
# the same 193 degrees. Independent agreement with the CAD to the same degree
# as the original photo is what makes it safe to use, and it segments into 22
# clean rooms instead of 34 ragged ones.
# Which boards make up which building. M3's ground floor is still missing: it is
# split across two wing boards that have to be paired into one floor first.
FLOORS = {
    'M4': [(0, 'M4_G_gem'), (1, 'M4_L1_gem')],
    'M3': [(0, 'M3_G_gem'), (1, 'M3_L1_gem')],
}

# Room names, read off the redrawn boards. Indices are board room numbers from
# tools/build_board.py, so they move whenever the segmentation changes -- these
# were remapped automatically by projecting each old room's centroid back
# through its registration and finding the new blob under it.
NAMES = {
 'M4_G_gem': {0:('Lectures Hall','lecture'), 1:('Computer Laboratory','lab'), 2:('Classroom 3','classroom'), 3:('Classroom 4','classroom'), 4:('Classroom 6','classroom'), 5:('Classroom 1','classroom'), 6:('Classroom 5','classroom'), 7:('Classroom 2','classroom'), 8:('Music Room','amenity'), 9:('Reception','office'), 10:('Male Toilet','toilet'), 11:('Female Toilet','toilet'), 17:('Elec','service'), 21:('AV Equipment','service'), 22:('Male Prayer Room','amenity'), 24:('Mechanical Room','service')},
 'M4_L1_gem': {0:("Exec Director's Toilet",'toilet'), 1:('Classroom 8','classroom'), 2:('Classroom 7','classroom'), 3:('Open Workstation','office'), 4:('Faculty Office (semi pvt)','office'), 5:('Library','amenity'), 6:('Conference Room 1','office'), 7:('Male Toilet','toilet'), 8:('Female Toilet','toilet'), 9:('IT Room','service'), 11:('AV Equipment','service'), 12:('Campus General Manager','office'), 15:('Elec','service'), 16:("Executive Director's Office",'office'), 17:('Elec','service'), 18:('Deputy Executive Director','office'), 21:('Stair (west)','stair')},
 'M3_G_gem': {0:('Workshop / Makerspace Lab','lab'), 2:('Computer Lab 02','lab'), 3:('Computer Lab 01','lab'), 5:('Male Prayer Room','amenity'), 9:('Female Prayer Room','amenity'), 11:('Female Toilet','toilet'), 12:('IT Room','service'), 40:('Stair (north)','stair')},
 'M3_L1_gem': {1:('Electrical Lab','lab'), 2:('Energy Transition Lab','lab'), 3:('Chemistry Lab','lab'), 4:('Biology Lab','lab'), 5:('Computer Lab 04','lab'), 6:('IT Room','service'), 8:('Waste','service'), 15:('Pantry','amenity'), 16:('Store','service'), 17:('Store & Preparation','service'), 19:('Pod Toilet','toilet'), 24:('Cell Culture Room','lab'), 26:('Store','service'), 28:('Store','service'), 33:('Lift','service'), 44:('Male Toilet','toilet')},
}
CODES = {
 'M4_G_gem': {0:'M4-0-005', 1:'M4-0-018', 2:'M4-0-011', 3:'M4-0-017', 4:'M4-0-021', 6:'M4-0-019', 7:'M4-0-006'},
 'M4_L1_gem': {1:'M4-1-011', 2:'M4-1-017'},
 'M3_G_gem': {2:'M3-0-022'},
 'M3_L1_gem': {1:'M3-1-014', 2:'M3-1-009', 3:'M3-1-029', 4:'M3-1-031', 5:'M3-1-004'},
}

# M3's Male Toilet was invisible until the room filter stopped using compactness:
# cubicle partitions make it deeply concave and it scored solidity 0.71 against a
# 0.72 threshold, so the room was deleted by one hundredth. Evan spotted it on
# the ground: computer lab on the left as you enter, then the female washroom,
# then the male one right next to it.
NAMES['M3_G_gem'][13] = ('Male Toilet', 'toilet')

# Evan, on the ground: the space the M4 board calls "Reception" is not one, and
# the prayer rooms are marked wrong too. A board label is evidence, not proof --
# these boards are years old. Unnamed is the honest state until he says what
# they actually are, and an unnamed room still renders, it just carries no claim.
for _bid, _i in (('M4_G_gem', 9),      # "Reception"
                 ('M4_G_gem', 22),     # "Male Prayer Room"
                 ('M3_G_gem', 5),      # "Male Prayer Room"
                 ('M3_G_gem', 9)):     # "Female Prayer Room"
    NAMES[_bid].pop(_i, None)

# M3-0-004, the timetable's "Computer Lab 03". It sits in the wing the redraw
# leaves unlabelled, so it stayed unassigned until Evan pointed at it: board
# room 1, the 60 m2 space in the right wing past the toilets. Its two siblings
# are 60.2 and 61.2 m2, which is the corroboration, not the reason.
NAMES['M3_G_gem'][1] = ('Computer Lab 03', 'lab')

# The Physics Lab, 100 m2 and the biggest room on M3 level 1. The automatic
# remap after a re-segmentation dropped it without a word, which is exactly the
# failure the report at the end of main() now makes impossible to miss.
NAMES['M3_L1_gem'][0] = ('Physics Lab', 'lab')
CODES['M3_G_gem'][1] = 'M3-0-004' 

# Slivers of wall the fill segmentation caught, and one blob that lands outside
# the building entirely on the L1 board.
DROP = {'M4_G_gem': {17, 20}, 'M4_L1_gem': set(),
        'M3_L1_gem': set(), 'M3_G_gem': set()}


def main(code='M4'):
    src = open('boards-data.js').read()
    BOARDS = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))

    plan = FLOORS[code]
    reg = {}
    for _, bid in plan:
        try:
            reg[bid] = json.load(open(f'/tmp/reg_{bid}.json'))
        except FileNotFoundError:
            sys.exit(f'run tools/register_board.py {bid} first')
    PPM = reg[plan[0][1]]['ppm']
    CH, CW = reg[plan[0][1]]['cad_shape']

    # CAD raster pixel -> metres, y-down, origin at the footprint's top-left
    def to_m(px, py):
        # cast: the warped coords arrive as numpy float32, which json refuses
        return [round(float(px) / PPM, 2), round(float(py) / PPM, 2)]

    # ---- the envelope, from the CAD. Same polygon for both floors: the shell
    # repeats vertically, which is exactly what lets level 1 exist at all.
    oc2name, streams = load()
    allp = parse(oc2name, streams)
    own = building_layers(allp, code)
    seg = [(classify(k), pl) for k, v in own.items() for pl in v]
    pts = [p for c, pl in seg if c in ('wall', 'glazing', 'structure') for p in pl]
    x0, y0 = min(p[0] for p in pts), min(p[1] for p in pts)
    cadpx = lambda x, y: (int((x - x0) * M_PER_UNIT * PPM) + 10,
                          int(CH - 10 - (y - y0) * M_PER_UNIT * PPM))

    shell = np.zeros((CH, CW), np.uint8)
    for c, pl in seg:
        if c in ('wall', 'glazing', 'structure'):
            cv2.polylines(shell, [np.array([cadpx(x, y) for x, y in pl], np.int32)], False, 255, 2)
    k = int(2.0 * PPM) | 1
    shell = cv2.morphologyEx(shell, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    ff = shell.copy(); cv2.floodFill(ff, np.zeros((CH + 2, CW + 2), np.uint8), (0, 0), 255)
    solid = cv2.bitwise_or(shell, cv2.bitwise_not(ff))
    # Open away thin appendages before contouring. The CAD footprint picks up
    # canopy and walkway linework that hangs off the building as a narrow claw --
    # on M3 that spur reached several metres past the top-right corner, and since
    # the corridor is derived as envelope-minus-rooms it inherited the spur and
    # rendered as a spidery mass floating outside the building on both floors.
    # A real wing is metres wide and survives; a drawn line is not.
    solid = cv2.morphologyEx(solid, cv2.MORPH_OPEN,
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(2.5 * PPM) | 1,) * 2))
    # Union in each registered board's own footprint. The CAD is authoritative
    # where it exists, but it is not always complete: M3's A-M3 layers miss the
    # wing containing the Physics Lab, which left that 100 m2 room only 38%
    # inside the envelope and silently rejected. The boards are the source of
    # truth for layout, so where the CAD is short, they fill in.
    for _, _bid in plan:
        f = cv2.imread(f'/tmp/reg_{_bid}_fit.png', cv2.IMREAD_GRAYSCALE)
        if f is not None and f.shape == solid.shape:
            solid = cv2.bitwise_or(solid, f)
    solid = cv2.morphologyEx(solid, cv2.MORPH_CLOSE,
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(1.5 * PPM) | 1,) * 2))
    env_c = max(cv2.findContours(solid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    envelope = np.zeros((CH, CW), np.uint8)
    cv2.drawContours(envelope, [env_c], -1, 255, -1)
    env_poly = [to_m(*p) for p in cv2.approxPolyDP(env_c, 2.0, True).reshape(-1, 2)]
    print(f'envelope {(envelope > 0).sum() / PPM**2:,.0f} m2, {len(env_poly)} corners')

    # ---- doors, from the CAD. Ground floor only; there is no level-1 drawing.
    doors = []
    for c, pl in seg:
        if c != 'door': continue
        q = [cadpx(x, y) for x, y in pl]
        for a, b in zip(q, q[1:]):
            L = np.hypot(b[0] - a[0], b[1] - a[1]) / PPM
            if 0.6 < L < 2.6:                    # a real leaf or threshold
                doors.append({'a': to_m(*a), 'b': to_m(*b)})
    print(f'{len(doors)} door segments from the CAD')

    floors = []
    for level, bid in plan:
        A = np.array(reg[bid]['affine'], np.float32)
        b = BOARDS[bid]
        warp = lambda x, y: (A[0, 0] * x + A[0, 1] * y + A[0, 2],
                             A[1, 0] * x + A[1, 1] * y + A[1, 2])

        used = np.zeros((CH, CW), np.uint8)
        rooms = []
        for r in b['rooms']:
            if r['i'] in DROP[bid]: continue
            poly = [warp(*p) for p in r['poly']]
            arr = np.array(poly, np.int32)
            if cv2.contourArea(arr.astype(np.float32)) / PPM**2 < 1.0: continue
            # a room must actually sit inside the building
            m = np.zeros((CH, CW), np.uint8); cv2.fillPoly(m, [arr], 255)
            inside = np.logical_and(m > 0, envelope > 0).sum() / max((m > 0).sum(), 1)
            if inside < 0.6: continue
            cv2.fillPoly(used, [arr], 255)
            name, kind = NAMES[bid].get(r['i'], (None, 'service'))
            # tools/build_board.py detects stairs in their own pass and tags them;
            # they are what connects the floors, so never leave one unnamed.
            if r.get('kind') == 'stair' and not name:
                name, kind = 'Stair', 'stair' 
            rooms.append({'i': r['i'], 'name': name, 'kind': kind,
                          'code': CODES[bid].get(r['i']),
                          'area': round(cv2.contourArea(arr.astype(np.float32)) / PPM**2, 1),
                          'p': [to_m(*p) for p in poly]})

        # ---- corridor = envelope minus rooms. No drawing, no detection.
        rest = cv2.bitwise_and(envelope, cv2.bitwise_not(used))
        rest = cv2.morphologyEx(rest, cv2.MORPH_OPEN,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(1.2 * PPM) | 1,) * 2))
        cs, _ = cv2.findContours(rest, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        corr = []
        for c in cs:
            a = cv2.contourArea(c) / PPM**2
            if a < 6: continue
            corr.append({'area': round(a, 1),
                         'p': [to_m(*p) for p in cv2.approxPolyDP(c, 1.5, True).reshape(-1, 2)]})
        corr.sort(key=lambda c: -c['area'])
        # Evan's edit in the plan editor was to delete the sliver "rooms" the
        # segmentation leaves behind -- bits of wall that are not spaces. Apply
        # that as a rule instead of a one-off export, so it holds for every board
        # and every rebuild. A named room or a stair is never dropped, however
        # small: the stairs are what connect the floors and a name is knowledge
        # that cost something to get.
        before = len(rooms)
        rooms = [r for r in rooms
                 if r['name'] or r['kind'] == 'stair' or r['area'] >= SLIVER_M2]
        if before != len(rooms):
            print(f'    dropped {before - len(rooms)} unnamed slivers under {SLIVER_M2} m2')

        rooms.sort(key=lambda r: -r['area'])
        print(f'{bid}: {len(rooms)} rooms ({sum(1 for r in rooms if r["name"])} named, '
              f'{sum(r["area"] for r in rooms):,.0f} m2) + {len(corr)} circulation pieces '
              f'({sum(c["area"] for c in corr):,.0f} m2)  [IoU {reg[bid]["iou"]:.3f}]')
        # A room this big with no name is almost always a name that got lost when
        # the board indices moved, not a room nobody knows. Say so out loud.
        anon = sorted((r for r in rooms if not r['name']), key=lambda r: -r['area'])[:3]
        if anon and anon[0]['area'] > 30:
            print('    ! biggest UNNAMED: ' +
                  ', '.join(f"#{r['i']} {r['area']:.0f} m2" for r in anon if r['area'] > 30))
        floors.append({'level': level, 'label': b['label'], 'y': level * FLOOR_H,
                       'iou': round(reg[bid]['iou'], 3),
                       'rooms': rooms, 'corridor': corr})

    # Where this building sits in campus coordinates, so two of them can be
    # dropped into one scene and land in their real relative positions.
    ox = x0 * M_PER_UNIT - 10 / PPM
    oz = -(CH - 10) / PPM - y0 * M_PER_UNIT

    W = max(p[0] for p in env_poly); D = max(p[1] for p in env_poly)
    data = {'building': code, 'w': round(W, 2), 'd': round(D, 2),
            'origin': [round(ox, 2), round(oz, 2)],
            'floorH': FLOOR_H, 'wallH': WALL_H,
            'envelope': env_poly, 'doors': doors, 'floors': floors}
    js = ('// AUTO-GENERATED by tools/fuse_m4.py -- do not hand-edit.\n'
          '// Envelope and doors from the CAD; rooms and names from the evacuation\n'
          '// boards, registered onto the CAD; corridor derived as envelope minus\n'
          '// rooms. Level 1 reuses the ground floor envelope: the shell repeats\n'
          '// vertically and no level-1 CAD exists. Metres, y-down in plan.\n'
          '// Pushed onto a shared list so one page can show several buildings.\n'
          f'(window.BUILDINGS = window.BUILDINGS || []).push({json.dumps(data, separators=(",", ":"))});\n')
    open(f'{code.lower()}-data.js', 'w').write(js)
    print(f'\nwrote {code.lower()}-data.js  {len(js)/1024:.0f} KB  ({W:.1f} x {D:.1f} m)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'M4')
