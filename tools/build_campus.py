#!/usr/bin/env python3
"""
Build the whole-campus 3D model data from the ground-floor CAD.

    python3 tools/build_campus.py        # -> campus-data.js

What is REAL here: every footprint outline and every interior wall, straight
off the architect's drawing.

What is ASSUMED: storey counts, and therefore heights. The CAD is a single
level (every building's layers carry the level token "100"), so it says
nothing about how tall anything is. STOREYS below records what is actually
known and marks the rest as a guess; the page shows that distinction.
"""
import json, math, re, sys, collections
import numpy as np, cv2

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from extract_floorplan import load, parse, classify, building_layers

# One CAD unit in metres.
# The drawing carries no dimensions, so this is solved against the floor areas
# printed on the buildings' own fire-evacuation boards: M4 3159 m2, M3 3050 m2,
# each over Ground + Level 01. Against the footprints those give 0.1193 (M4) and
# 0.1160 (M3) -- two independent buildings agreeing to 1.4%, so 0.1177 +/-1.5%.
# The earlier 0.1035 came from calling a door threshold 0.95 m and was ~13% low,
# which made every room ~28% too small. Sanity check: at 0.1177 the median door
# threshold is 1.09 m, a normal single-door opening.
M_PER_UNIT = 0.1177
FLOOR_H    = 4.0          # metres floor-to-floor, typical for this kind of build

# Building groups in the drawing that are buildings (not roads, kerbs, parking).
BUILDING_GROUPS = ('Xref_135_MASTER_BLDG_REV9_G.F', 'REC-C-GF', 'FSP-ENT-GF')

# Storey counts. "known" ones are evidenced, the rest are a stated guess:
#   M3, M4  -> the fire-evacuation boards inside them show Ground + Level 01
#   M2      -> the timetable books room M2-2-xxx, so it has at least a level 2
STOREYS = {
    'M1': (2, False), 'M2': (3, True), 'M3': (2, True), 'M4': (2, True),
    'F1': (2, False), 'F2': (2, False), 'F3': (2, False), 'F4': (2, False),
    'FR1': (4, False), 'SV1': (2, False), 'SV2': (2, False),
    'AF1': (3, False), 'AF3': (2, False), 'EH': (2, False),
    'MP': (1, False), 'FP': (1, False),     # promenades: covered walkway, one level
}
DEFAULT_STOREYS = 2

# Names for the codes the drawing itself carries. Anything not here is left
# unnamed for Evan to label in the page rather than guessed at here.
NAMED = {'M1': 'M1 Teaching', 'M2': 'M2 Teaching', 'M3': 'M3 Labs & Teaching',
         'M4': 'M4 Teaching', 'F1': 'F1 Teaching', 'F2': 'F2 Teaching',
         'F3': 'F3 Student Activities', 'F4': 'F4 Student Activities',
         'FR1': "FR1 Women's Residence", 'SV1': 'SV1 Service', 'SV2': 'SV2 Service',
         'MP': 'Male Promenade', 'FP': 'Female Promenade'}

# Codes that have their own layers in the drawing, so we can cut an exact
# footprint for each. "WIN" is a windows layer, not a building -- skip it.
CODES = ('M1', 'M2', 'M3', 'M4', 'F1', 'F2', 'F3', 'F4',
         'FR1', 'SV1', 'SV2', 'AF1', 'AF3', 'EH', 'FP', 'MP')

# The site drawing's own massing layer. One closed polygon per building, but
# coarse: it lumps M1-M4 into a single blob. Used only for the buildings that
# have no layers of their own, so the campus reads whole.
MASSING_LAYER = 'PHASE I BUILDINGS' 

# Buildings whose interior walls are worth carrying into 3D. The rest are
# massing only -- nobody needs the partition layout of the car park.
INTERIORS = ('M1', 'M2', 'M3', 'M4')


def contours_from(polys, ppu, close=5, mode=cv2.RETR_EXTERNAL, min_px=400, eps_m=None):
    """Rasterise polylines, then read shapes back out. Survives the hairline
    gaps and duplicate lines that defeat any exact planar-graph approach."""
    pts = [p for pl in polys for p in pl]
    X0, Y0 = min(p[0] for p in pts) - 2, min(p[1] for p in pts) - 2
    X1, Y1 = max(p[0] for p in pts) + 2, max(p[1] for p in pts) + 2
    W, H = int((X1 - X0) * ppu), int((Y1 - Y0) * ppu)
    img = np.zeros((H, W), np.uint8)
    for pl in polys:
        q = np.array([[int((x - X0) * ppu), int(H - (y - Y0) * ppu)] for x, y in pl], np.int32)
        cv2.polylines(img, [q], False, 255, 2)
    if close:
        img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8), iterations=2)
    cs, _ = cv2.findContours(img, mode, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < min_px: continue
        # Simplify by a fixed distance, not a fraction of the perimeter: a long
        # thin wall loop has a huge perimeter, and a proportional epsilon collapses
        # its two sides into each other. Self-intersecting rings then extrude into
        # triangle fans instead of walls.
        eps = (eps_m / M_PER_UNIT * ppu) if eps_m else 0.004 * cv2.arcLength(c, True)
        ap = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(ap) < 3: continue
        if cv2.contourArea(ap.astype(np.int32)) < min_px * 0.5: continue
        out.append([(X0 + px / ppu, Y0 + (H - py) / ppu) for px, py in ap])
    return out


def footprint_from(polys, ppu=1.0, seal_m=4.5):
    """Solid outline of a building from its wall lines.

    Contouring the lines directly does not work: facades have real gaps at every
    entrance, so the outer contour leaks and you get a fragment. Instead seal the
    gaps with a morphological close wide enough to bridge a doorway, fill what is
    now enclosed, and contour the solid. Corners round by seal_m/2, which is
    invisible on a massing model.
    """
    pts = [p for pl in polys for p in pl]
    if not pts: return None
    X0, Y0 = min(p[0] for p in pts) - 8, min(p[1] for p in pts) - 8
    X1, Y1 = max(p[0] for p in pts) + 8, max(p[1] for p in pts) + 8
    W, H = int((X1 - X0) * ppu), int((Y1 - Y0) * ppu)
    if W < 4 or H < 4 or W * H > 40_000_000: return None
    img = np.zeros((H, W), np.uint8)
    for pl in polys:
        q = np.array([[int((x - X0) * ppu), int(H - (y - Y0) * ppu)] for x, y in pl], np.int32)
        cv2.polylines(img, [q], False, 255, 2)
    k = max(3, int(seal_m / M_PER_UNIT * ppu) | 1)
    img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    # flood from the border: whatever the flood cannot reach is inside the building
    ff = img.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    solid = cv2.bitwise_or(img, cv2.bitwise_not(ff))
    cs, _ = cv2.findContours(solid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cs: return None
    c = max(cs, key=cv2.contourArea)
    ap = cv2.approxPolyDP(c, 0.006 * cv2.arcLength(c, True), True).reshape(-1, 2)
    return [(X0 + px / ppu, Y0 + (H - py) / ppu) for px, py in ap]


def trim(polys, pct=99.0, slack=1.35):
    """Drop the handful of strays that shoot far outside a building's mass."""
    pts = np.array([p for pl in polys for p in pl])
    med = np.median(pts, axis=0)
    lim = np.percentile(np.abs(pts - med), pct, axis=0) * slack
    return [pl for pl in polys
            if all(abs(x - med[0]) <= lim[0] and abs(y - med[1]) <= lim[1] for x, y in pl)]


def main():
    oc2name, streams = load()
    allp = parse(oc2name, streams)
    bld = {k: v for k, v in allp.items()
           if k and k.split('$')[0].startswith(BUILDING_GROUPS) and classify(k) != 'fitout'}
    print(f'building layers: {len(bld)}  polylines: {sum(len(v) for v in bld.values())}')

    polys = [pl for v in bld.values() for pl in v]
    pts = [p for pl in polys for p in pl]
    X0, X1 = min(p[0] for p in pts), max(p[0] for p in pts)
    Y0, Y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    print(f'campus extent {(X1-X0)*M_PER_UNIT:.0f} x {(Y1-Y0)*M_PER_UNIT:.0f} m')

    # ---- 1. footprints from the site drawing's own massing layer.
    # These are complete closed outlines (the wall linework is not: every
    # entrance is a real gap, so contouring it leaks). Their one flaw is that
    # they lump a connected cluster like M1-M4 into a single polygon, which
    # step 2 undoes.
    mass = [pl for k, v in allp.items() if k and MASSING_LAYER in k for pl in v if len(pl) >= 4]
    seen, outlines = set(), []
    for pl in mass:
        a_ = abs(cv2.contourArea(np.array(pl, np.float32)))
        if a_ * M_PER_UNIT ** 2 < 150: continue
        cx = round(sum(p[0] for p in pl) / len(pl), 1)
        cy = round(sum(p[1] for p in pl) / len(pl), 1)
        key = (round(a_), cx, cy)
        if key in seen: continue                    # the layer is drawn twice over
        seen.add(key)
        outlines.append(pl)
    print(f'{len(outlines)} massing outlines '
          f'({sum(abs(cv2.contourArea(np.array(p, np.float32))) for p in outlines)*M_PER_UNIT**2:,.0f} m2 total)')

    # ---- 2. identity: each code's own wall linework, as a point cloud
    clouds = {}
    for code in CODES:
        lay = building_layers(bld, code)
        if not lay: continue
        pts_ = [q for k, v in lay.items() if classify(k) in ('wall', 'glazing') for pl in v for q in pl]
        if len(pts_) > 200: clouds[code] = np.array(pts_, np.float32)
    print(f'identity clouds: {", ".join(sorted(clouds))}')

    def split(poly):
        """Cut one outline into per-building pieces by nearest wall linework.
        Returns [(code_or_None, polygon), ...]."""
        arr = np.array(poly, np.float32)
        inside = [c for c, p in clouds.items()
                  if np.mean([cv2.pointPolygonTest(arr, (float(x), float(y)), False) >= 0
                              for x, y in p[::37]]) > 0.5]
        if len(inside) < 2:
            return [(inside[0] if inside else None, poly)]
        PP = 0.7
        X0_, Y0_ = arr[:, 0].min() - 3, arr[:, 1].min() - 3
        X1_, Y1_ = arr[:, 0].max() + 3, arr[:, 1].max() + 3
        W_, H_ = int((X1_ - X0_) * PP), int((Y1_ - Y0_) * PP)
        px = lambda x, y: (int((x - X0_) * PP), int(H_ - (y - Y0_) * PP))
        blob = np.zeros((H_, W_), np.uint8)
        cv2.fillPoly(blob, [np.array([px(x, y) for x, y in poly], np.int32)], 255)
        # distance from every pixel to each building's walls; nearest one wins
        best = np.full((H_, W_), np.inf, np.float32)
        who = np.zeros((H_, W_), np.int32)
        for n, code in enumerate(sorted(inside), start=1):
            m_ = np.full((H_, W_), 255, np.uint8)
            for x, y in clouds[code]:
                qx, qy = px(x, y)
                if 0 <= qx < W_ and 0 <= qy < H_: m_[qy, qx] = 0
            d = cv2.distanceTransform(m_, cv2.DIST_L2, 3)
            take = d < best
            best[take], who[take] = d[take], n
        out_ = []
        for n, code in enumerate(sorted(inside), start=1):
            part = ((who == n) & (blob > 0)).astype(np.uint8) * 255
            part = cv2.morphologyEx(part, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
            cs, _ = cv2.findContours(part, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cs: continue
            c = max(cs, key=cv2.contourArea)
            if cv2.contourArea(c) * (M_PER_UNIT / PP) ** 2 < 120: continue
            ap = cv2.approxPolyDP(c, 0.005 * cv2.arcLength(c, True), True).reshape(-1, 2)
            out_.append((code, [(X0_ + qx / PP, Y0_ + (H_ - qy) / PP) for qx, qy in ap]))
        return out_ or [(None, poly)]

    foot = []
    for pl in outlines:
        foot.extend(split(pl))
    for code, pl in sorted(foot, key=lambda t: -abs(cv2.contourArea(np.array(t[1], np.float32)))):
        print(f'  {(code or "?"):4} {len(pl):3} verts  '
              f'{abs(cv2.contourArea(np.array(pl, np.float32)))*M_PER_UNIT**2:8,.0f} m2')

    # ---- 3. interior walls for the buildings that matter
    inner = {}
    for code in INTERIORS:
        lay = building_layers(bld, code)
        w = [pl for k, v in lay.items() if classify(k) in ('wall', 'glazing') for pl in v]
        if not w: continue
        inner[code] = contours_from(w, ppu=4.0, close=3, mode=cv2.RETR_LIST, min_px=120, eps_m=0.12)
        print(f'  {code}: {len(inner[code])} wall bodies from {len(w)} polylines')

    # ---- 4. emit, in metres, y-down -> we hand three.js x/z directly
    def m(x, y): return [round((x - X0) * M_PER_UNIT, 2), round((Y1 - y) * M_PER_UNIT, 2)]

    out = []
    for i, (code, poly) in enumerate(foot):
        n, known = STOREYS.get(code, (DEFAULT_STOREYS, False))
        out.append({'i': i, 'code': code, 'name': NAMED.get(code),
                    'storeys': n, 'hKnown': known, 'h': round(n * FLOOR_H, 1),
                    'p': [m(*q) for q in poly]})
    out.sort(key=lambda b: -cv2.contourArea(np.array(b['p'], np.float32)))
    for i, b in enumerate(out): b['i'] = i

    walls = {c: [[m(*q) for q in poly] for poly in v] for c, v in inner.items()}

    data = {'w': round((X1 - X0) * M_PER_UNIT, 1), 'd': round((Y1 - Y0) * M_PER_UNIT, 1),
            'floorH': FLOOR_H, 'buildings': out, 'walls': walls}
    js = ('// AUTO-GENERATED by tools/build_campus.py -- do not hand-edit.\n'
          '// Footprints and interior walls are REAL, straight off the campus CAD.\n'
          '// Storey counts (and so heights) are ASSUMED except where hKnown is true.\n'
          f'const CAMPUS = {json.dumps(data, separators=(",", ":"))};\n')
    open('campus-data.js', 'w').write(js)
    named = sum(1 for b in out if b['code'])
    print(f'wrote campus-data.js  {len(js)/1024:.0f} KB  '
          f'({len(out)} buildings, {named} identified, {sum(len(v) for v in walls.values())} wall bodies)')


if __name__ == '__main__':
    main()
