#!/usr/bin/env python3
"""
Fuse the CAD and the boards into one model of M4.

    python3 tools/register_board.py M4_G
    python3 tools/register_board.py M4_L1
    python3 tools/fuse_m4.py                 # -> m4-data.js

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
NAMES = {
 'M4_G_gem': {
    0:('Lectures Hall','lecture'),        1:('Computer Laboratory','lab'),
    2:('Classroom 3','classroom'),        3:('Classroom 4','classroom'),
    4:('Classroom 6','classroom'),        5:('Classroom 1','classroom'),
    6:('Classroom 5','classroom'),        7:('Classroom 2','classroom'),
    8:('Music Room','amenity'),           9:('Reception','office'),
    10:('Male Toilet','toilet'),         11:('Female Toilet','toilet'),
    12:('IT Room','service'),            13:('Elec','service'),
    14:('Stair (west)','stair'),         15:('Elec','service'),
    16:('Stair (east)','stair'),         18:('AV Equipment','service'),
    19:('Male Prayer Room','amenity'),   21:('Mechanical Room','service')},
 'M4_L1_gem': {
    0:('Conference Room 2','office'),     1:('Classroom 8','classroom'),
    2:('Classroom 7','classroom'),        3:('Open Workstation','office'),
    4:('Faculty Office (semi pvt)','office'),
    5:('Library','amenity'),              6:('Conference Room 1','office'),
    7:('Male Toilet','toilet'),           8:('Female Toilet','toilet'),
    9:('IT Room','service'),             10:('AV Equipment','service'),
    11:('Campus General Manager','office'),
    14:('Elec','service'),               15:("Executive Director's Office",'office'),
    16:('Elec','service'),               17:('Deputy Executive Director','office'),
    18:('Stair (east)','stair'),         19:('Stair (west)','stair'),
    49:("Exec Director's Toilet",'toilet')},
}
CODES = {'M4_G_gem':  {0:'M4-0-005', 1:'M4-0-018', 2:'M4-0-011', 3:'M4-0-017',
                       4:'M4-0-021', 6:'M4-0-019', 7:'M4-0-006'},
         'M4_L1_gem': {1:'M4-1-011', 2:'M4-1-017'}}

# Slivers of wall the fill segmentation caught, and one blob that lands outside
# the building entirely on the L1 board.
DROP = {'M4_G_gem': {17, 20}, 'M4_L1_gem': set()}


def main():
    src = open('boards-data.js').read()
    BOARDS = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))

    reg = {}
    for bid in ('M4_G_gem', 'M4_L1_gem'):
        try:
            reg[bid] = json.load(open(f'/tmp/reg_{bid}.json'))
        except FileNotFoundError:
            sys.exit(f'run tools/register_board.py {bid} first')
    PPM = reg['M4_G_gem']['ppm']
    CH, CW = reg['M4_G_gem']['cad_shape']

    # CAD raster pixel -> metres, y-down, origin at the footprint's top-left
    def to_m(px, py):
        # cast: the warped coords arrive as numpy float32, which json refuses
        return [round(float(px) / PPM, 2), round(float(py) / PPM, 2)]

    # ---- the envelope, from the CAD. Same polygon for both floors: the shell
    # repeats vertically, which is exactly what lets level 1 exist at all.
    oc2name, streams = load()
    allp = parse(oc2name, streams)
    own = building_layers(allp, 'M4')
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
    for level, bid in ((0, 'M4_G_gem'), (1, 'M4_L1_gem')):
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
        rooms.sort(key=lambda r: -r['area'])
        print(f'{bid}: {len(rooms)} rooms ({sum(1 for r in rooms if r["name"])} named, '
              f'{sum(r["area"] for r in rooms):,.0f} m2) + {len(corr)} circulation pieces '
              f'({sum(c["area"] for c in corr):,.0f} m2)  [IoU {reg[bid]["iou"]:.3f}]')
        floors.append({'level': level, 'label': b['label'], 'y': level * FLOOR_H,
                       'iou': round(reg[bid]['iou'], 3),
                       'rooms': rooms, 'corridor': corr})

    W = max(p[0] for p in env_poly); D = max(p[1] for p in env_poly)
    data = {'building': 'M4', 'w': round(W, 2), 'd': round(D, 2),
            'floorH': FLOOR_H, 'wallH': WALL_H,
            'envelope': env_poly, 'doors': doors, 'floors': floors}
    js = ('// AUTO-GENERATED by tools/fuse_m4.py -- do not hand-edit.\n'
          '// Envelope and doors from the CAD; rooms and names from the evacuation\n'
          '// boards, registered onto the CAD; corridor derived as envelope minus\n'
          '// rooms. Level 1 reuses the ground floor envelope: the shell repeats\n'
          '// vertically and no level-1 CAD exists. Metres, y-down in plan.\n'
          f'const M4 = {json.dumps(data, separators=(",", ":"))};\n')
    open('m4-data.js', 'w').write(js)
    print(f'\nwrote m4-data.js  {len(js)/1024:.0f} KB  ({W:.1f} x {D:.1f} m)')


if __name__ == '__main__':
    main()
