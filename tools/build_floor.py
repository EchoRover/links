#!/usr/bin/env python3
"""
Turn one building's CAD layers into the data the floor-plan page draws.

    python3 tools/build_floor.py M4            # -> floors-data.js (+ a check PNG)

Two steps:
  1. RASTERISE the barrier layers (walls, glazing, structure, doors) and label
     the enclosed pockets of free space. Each pocket is a room. This beats
     trying to find faces in the raw linework, which is full of hairline gaps
     and overlapping duplicates that no planar-graph pass survives.
  2. EXPORT walls as SVG path data plus one polygon per room, rotated so the
     building sits square to the screen and scaled to metres.

The drawing carries NO room numbers, so nothing here guesses which room is
M4-0-019. That mapping is made by hand in the page's label mode.
"""
import json, math, re, sys, collections
import numpy as np, cv2

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from extract_floorplan import load, parse, classify, building_layers

PPU     = 6         # raster pixels per CAD unit, for room finding
MIN_M2  = 1.4       # ignore pockets smaller than this (duct shafts, wall cavities)
# What encloses a room. Columns are freestanding, so counting them as barriers
# chops a big hall into wedges -- that is what split M4's Lecture Hall into
# three. Glazing has to stay in: a lot of M4's internal partitions are glazed.
BARRIER = {'wall', 'door', 'glazing'}
SHELL   = {'wall', 'door', 'glazing', 'structure'}

# Doorways are gaps in the wall linework, so a raw flood fill runs straight
# through them and merges every room with the corridor. Close the barrier by a
# door's width first. Swept against the room sizes printed on M4's evacuation
# board: below ~1.2 m the halls still bleed together, above ~1.8 m real
# doorway-width alcoves start disappearing. 1.5 m puts Lectures Hall (132 m2)
# and Computer Laboratory (123 m2) out as single rooms, which is what the
# board shows.
DOOR_SEAL_M = 1.5

# One CAD unit in metres.
# The drawing carries no dimensions, so this is solved against the floor areas
# printed on the buildings' own fire-evacuation boards: M4 3159 m2, M3 3050 m2,
# each over Ground + Level 01. Against the footprints those give 0.1193 (M4) and
# 0.1160 (M3) -- two independent buildings agreeing to 1.4%, so 0.1177 +/-1.5%.
# The earlier 0.1035 came from calling a door threshold 0.95 m and was ~13% low,
# which made every room ~28% too small. Sanity check: at 0.1177 the median door
# threshold is 1.09 m, a normal single-door opening.
M_PER_UNIT = 0.1177


def clean(polys):
    """Drop the few strays that reach far outside the building's main mass."""
    pts = np.array([p for pl in polys for p in pl])
    med = np.median(pts, axis=0)
    d = np.abs(pts - med)
    lim = np.percentile(d, 99.5, axis=0) * 1.6
    return lim, med


def main(code):
    oc2name, streams = load()
    allp = parse(oc2name, streams)

    # A building's own A-<CODE>-* layers are NOT the whole building: for M4 they
    # are ~75% curtain-wall mullions, and most interior partitions sit on shared
    # master-xref layers that carry no building token at all. Selecting by layer
    # alone therefore extracts about half a floor. So: use the building's own
    # layers to establish WHERE it is, then take every piece of building linework
    # inside that footprint regardless of which layer drew it.
    own = building_layers(allp, code)
    if not own:
        sys.exit(f'no layers found for building {code}')
    op = [q for k, v in own.items() if classify(k) in SHELL for pl in v for q in pl]
    ox0, ox1 = min(p[0] for p in op), max(p[0] for p in op)
    oy0, oy1 = min(p[1] for p in op), max(p[1] for p in op)
    pad = 2.0 / M_PER_UNIT
    def inbox(pl):
        return all(ox0 - pad <= x <= ox1 + pad and oy0 - pad <= y <= oy1 + pad for x, y in pl)

    paths = collections.defaultdict(list)
    for k, v in allp.items():
        if not k or classify(k) == 'fitout': continue
        if k.split('$')[0].startswith(('Xref_135_MASTER_BLDG', 'REC-C-GF', 'FSP-ENT-GF')):
            for pl in v:
                if inbox(pl): paths[k].append(pl)
    n = sum(len(v) for v in paths.values())
    print(f'{code}: {len(paths)} CAD layers in footprint, {n} polylines '
          f'({sum(len(v) for v in own.values())} on its own A-{code} layers)')

    # No percentile trim. These buildings are long and set on a diagonal, so an
    # axis-aligned trim cuts a whole wing off -- which is what left a quarter of
    # M4 with no linework at all and no rooms in it.
    def keep(pl):
        return True

    # Only the classes that actually get drawn. Fit-out linework (furniture,
    # fire cabinets, elevation shading) is never rendered, so letting it into
    # the set would stretch the floor's bounds around geometry nobody can see.
    seg = [(c, pl) for k, v in paths.items() for pl in v
           if keep(pl) and (c := classify(k)) in SHELL]
    pts = [p for _, pl in seg for p in pl]
    X0, Y0 = min(p[0] for p in pts) - 3, min(p[1] for p in pts) - 3
    X1, Y1 = max(p[0] for p in pts) + 3, max(p[1] for p in pts) + 3
    print(f'  extent {X1-X0:.0f} x {Y1-Y0:.0f} units '
          f'({(X1-X0)*M_PER_UNIT:.0f} x {(Y1-Y0)*M_PER_UNIT:.0f} m)')

    # ---------- 1. find rooms ----------
    W, H = int((X1 - X0) * PPU), int((Y1 - Y0) * PPU)
    px = lambda pl: np.array([[int(round((x - X0) * PPU)), int(round(H - (y - Y0) * PPU))]
                              for x, y in pl], np.int32)

    # Interior partitions only.
    bar = np.zeros((H, W), np.uint8)
    for c, pl in seg:
        if c in BARRIER:
            cv2.polylines(bar, [px(pl)], False, 255, 2)
    ks = max(3, int(DOOR_SEAL_M / M_PER_UNIT * PPU) | 1)
    bar = cv2.morphologyEx(bar, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks)))

    # The perimeter, added as one sealed outline rather than as raw facade
    # linework. Without it the flood fill escapes through the glazed elevations
    # and every room merges into the outdoors; with the raw linework instead,
    # curtain-wall mullions reach inside and chop the big rooms up.
    skin = np.zeros((H, W), np.uint8)
    for c, pl in seg:
        cv2.polylines(skin, [px(pl)], False, 255, 2)
    k = max(3, int(6.0 / M_PER_UNIT * PPU) | 1)
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    ff = skin.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    solid = cv2.bitwise_or(skin, cv2.bitwise_not(ff))
    outline, _ = cv2.findContours(solid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if outline:
        inside = np.zeros((H, W), np.uint8)
        cv2.drawContours(inside, [max(outline, key=cv2.contourArea)], -1, 255, -1)
        # Pull in past the perimeter wall. Blocking OUTSIDE the shell wholesale,
        # rather than just stroking its outline, is what stops the ring between
        # the real facade and the dilated shell being found as a 266 m2 "room".
        er = max(3, int(1.0 / M_PER_UNIT * PPU) | 1)
        inside = cv2.erode(inside, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (er, er)))
        bar = cv2.bitwise_or(bar, cv2.bitwise_not(inside))

    cnt, lab, stats, cent = cv2.connectedComponentsWithStats((bar == 0).astype(np.uint8), connectivity=4)
    min_a = MIN_M2 / (M_PER_UNIT ** 2) * PPU * PPU
    rooms = []
    for i in range(1, cnt):
        x, y, w, h, a = stats[i]
        if a < min_a: continue
        if x <= 1 or y <= 1 or x + w >= W - 1 or y + h >= H - 1: continue   # touches frame = outdoors
        c = max(cv2.findContours((lab == i).astype(np.uint8),
                                 cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
        ap = cv2.approxPolyDP(c, 0.006 * cv2.arcLength(c, True), True).reshape(-1, 2)
        if len(ap) < 4: continue
        # Anchor the label at the pole of inaccessibility -- the centre of the
        # largest circle that fits inside the room -- not the centroid. An
        # L-shaped room or a snaking corridor has its centroid outside itself,
        # which silently puts the label in a wall or in the next room.
        sub = (lab[y:y + h, x:x + w] == i).astype(np.uint8)
        dt = cv2.distanceTransform(cv2.copyMakeBorder(sub, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0),
                                   cv2.DIST_L2, 5)
        _, _, _, mx = cv2.minMaxLoc(dt)
        ax, ay = x + mx[0] - 1, y + mx[1] - 1
        rooms.append({'a': a / (PPU * PPU),
                      'c': (X0 + ax / PPU, Y0 + (H - ay) / PPU),
                      'p': [(X0 + px / PPU, Y0 + (H - py) / PPU) for px, py in ap]})
    rooms.sort(key=lambda r: -r['a'])
    print(f'  {len(rooms)} enclosed spaces')

    # ---------- 2. square the building up ----------
    ang = []
    for c, pl in seg:
        if c != 'wall': continue
        for a, b in zip(pl, pl[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L >= 3: ang.extend([math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 90] * int(L))
    theta = float(np.argmax(np.histogram(ang, bins=90, range=(0, 90))[0])) + 0.5
    print(f'  dominant wall angle {theta:.1f}deg')
    t = math.radians(-theta); cs, sn = math.cos(t), math.sin(t)
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    rot = lambda x, y: ((x - cx) * cs - (y - cy) * sn, (x - cx) * sn + (y - cy) * cs)

    rp = [rot(x, y) for _, pl in seg for x, y in pl]
    mnx, mxx = min(p[0] for p in rp), max(p[0] for p in rp)
    mny, mxy = min(p[1] for p in rp), max(p[1] for p in rp)
    def out(x, y):
        px, py = rot(x, y)
        return (round((px - mnx) * M_PER_UNIT, 2), round((mxy - py) * M_PER_UNIT, 2))  # y-down, metres

    fw = round((mxx - mnx) * M_PER_UNIT, 2)
    fh = round((mxy - mny) * M_PER_UNIT, 2)

    layers = {}
    for kind in ('wall', 'glazing', 'structure', 'door'):
        d = []
        for c, pl in seg:
            if c != kind: continue
            p = [out(*pl[0])]
            for x, y in pl[1:]:
                q = out(x, y)
                if abs(q[0] - p[-1][0]) + abs(q[1] - p[-1][1]) >= 0.03: p.append(q)
            if len(p) > 1:
                d.append('M%s %s' % p[0] + ''.join('L%s %s' % q for q in p[1:]))
        layers[kind] = ''.join(d)
        print(f'    {kind:10} {len(layers[kind])/1024:6.1f} KB')

    R = [{'i': i, 'area': round(r['a'] * M_PER_UNIT ** 2, 1),
          'c': list(out(*r['c'])), 'p': [out(*p) for p in r['p']]}
         for i, r in enumerate(rooms)]

    floor = {'building': code, 'level': 0, 'w': fw, 'h': fh,
             'mPerUnit': M_PER_UNIT, 'layers': layers, 'rooms': R}
    js = ('// AUTO-GENERATED by tools/build_floor.py -- do not hand-edit.\n'
          '// Source: the ground-floor CAD inside assets/zu-abu-dhabi-campus-map.pdf.\n'
          '// Coordinates are metres, y-down, rotated square to the screen.\n'
          f'const FLOOR_{code}_G = {json.dumps(floor, separators=(",", ":"))};\n')
    open('floors-data.js', 'w').write(js)
    print(f'  wrote floors-data.js  {len(js)/1024:.0f} KB  ({len(R)} rooms, {fw} x {fh} m)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'M4')
