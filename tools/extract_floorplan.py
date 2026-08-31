#!/usr/bin/env python3
"""
Pull exact ground-floor architectural geometry out of the public ZU Abu Dhabi
campus PDF (assets/zu-abu-dhabi-campus-map.pdf).

That PDF is an AutoCAD export, not a picture. It still carries 795 named CAD
layers (OCGs) and ~414k line segments, including the master building xref
"Xref_135_MASTER_BLDG_REV9_G.F - 16.03.10" -- G.F = Ground Floor. So every
partition wall, door swing, column and glazing line on level 0 of the whole
campus is in there as vectors, tagged with the layer it was drawn on.

Usage:  python3 tools/extract_floorplan.py            -> writes paths_all.json
        python3 tools/extract_floorplan.py --png x0 y0 x1 y1 out.png
"""
import re, zlib, json, sys, collections

PDF = 'assets/zu-abu-dhabi-campus-map.pdf'
ID  = (1, 0, 0, 1, 0, 0)
NUM = re.compile(r'^[-+]?(\d+\.?\d*|\.\d+)$')

def mul(a, b):
    return (a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2],
            a[2]*b[1]+a[3]*b[3], a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5])

def ap(m, x, y):
    return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])

def load(pdf=PDF):
    d = open(pdf, 'rb').read()
    # object number -> CAD layer name
    objname = {int(m.group(1)): m.group(2).decode('latin1') for m in
               re.finditer(rb'(\d+)\s+0\s+obj\s*<<\s*/Type\s*/OCG\s*/Name\s*\(((?:[^()\\]|\\.)*)\)', d)}
    # /ocNNN marked-content tag -> layer name
    oc2name = {m.group(1).decode(): objname.get(int(m.group(2)), '?') for m in
               re.finditer(rb'/(oc\d+)\s+(\d+)\s+0\s+R', d)}
    # the drawing is split across four Form XObjects, all in one coordinate space
    streams = []
    for m in re.finditer(rb'stream\r?\n', d):
        s = m.end()
        try:
            z = zlib.decompress(d[s:d.find(b'endstream', s)])
        except Exception:
            continue
        if len(z) > 10000 and (b' l\n' in z[:200] or b' m\n' in z[:200]):
            streams.append(z)
    return oc2name, sorted(streams, key=len, reverse=True)

def parse(oc2name, streams):
    """Walk the content streams, returning {layer_name: [polyline, ...]}."""
    paths = collections.defaultdict(list)
    for raw in streams:
        c = raw.decode('latin1')
        c = re.sub(r'<[0-9A-Fa-f\s]*>', ' ', c)        # hex strings (text)
        c = re.sub(r'\((?:[^()\\]|\\.)*\)', ' ', c)    # literal strings
        toks = c.split()
        ctm, gs, layer, ocs, ops = ID, [], None, [], []
        cur, start, inT = [], None, False
        def flush():
            nonlocal cur
            if len(cur) > 1:
                paths[layer].append(cur)
            cur = []
        i, n = 0, len(toks)
        while i < n:
            t = toks[i]; i += 1
            if NUM.match(t): ops.append(float(t)); continue
            if t[0] == '/':  ops.append(t); continue
            if t == 'BT': inT = True;  ops = []; continue
            if t == 'ET': inT = False; ops = []; continue
            if t == 'q':  gs.append(ctm); ops = []; continue
            if t == 'Q':  ctm = gs.pop() if gs else ID; ops = []; continue
            if t == 'cm':
                if len(ops) >= 6: ctm = mul(tuple(ops[-6:]), ctm)
                ops = []; continue
            if t == 'BDC':                              # enter a CAD layer
                ocs.append(layer)
                g = [o for o in ops if isinstance(o, str) and o.startswith('/oc')]
                if g: layer = oc2name.get(g[-1][1:])
                ops = []; continue
            if t == 'EMC':                              # leave it
                layer = ocs.pop() if ocs else None; ops = []; continue
            if t in ('m', 'l') and len(ops) >= 2 and not inT:
                x, y = ap(ctm, ops[-2], ops[-1])
                if t == 'm': flush(); cur = [(x, y)]; start = (x, y)
                else: cur.append((x, y))
                ops = []; continue
            if t == 'c' and len(ops) >= 6 and not inT:
                cur.extend([ap(ctm, ops[j], ops[j+1]) for j in (-6, -4, -2)]); ops = []; continue
            if t == 'v' and len(ops) >= 4 and not inT:
                cur.extend([ap(ctm, ops[j], ops[j+1]) for j in (-4, -2)]); ops = []; continue
            if t == 're' and len(ops) >= 4 and not inT:
                x, y, w, h = ops[-4:]
                flush()
                cur = [ap(ctm, x, y), ap(ctm, x+w, y), ap(ctm, x+w, y+h), ap(ctm, x, y+h), ap(ctm, x, y)]
                flush(); ops = []; continue
            if t == 'h':
                if start and cur: cur.append(start)
                ops = []; continue
            if t in ('S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n'):
                flush(); ops = []; continue
            ops = []
        flush()
    return paths

# Which CAD layer means what, for styling and for finding rooms.
# The drawing is layered per building and per purpose, e.g.
#   A-M4-100$0$A-WALL-INTR   -> M4, level 100 (ground), interior wall
#   A-M4-COL$0$S-COLS        -> M4 columns
# so both the building and the meaning are recoverable from the name.
def classify(layer):
    nm = layer.split('$0$')[-1]
    if re.search(r'DOOR|_tur', nm, re.I):                              return 'door'
    if re.search(r'WALL|_wan|_maw|I-WALL', nm, re.I):                  return 'wall'
    if re.search(r'GLAS|GLAZ|CWMG|WIND|_fas|ALUM', nm, re.I):          return 'glazing'
    if re.search(r'COL|_stb|FNDN|STRS|trp|Slab Edge|PENETRATION', nm, re.I): return 'structure'
    if re.search(r'FURN|EQPT|FHC|SAN|_aus|ANNO|DETL|HRAL|elev_|BACK|'
                 r'CABN|PATT|FLSH|RISER|SHTR|boundary|FLOR-OPEN', nm, re.I): return 'fitout'
    return 'wall'

def building_layers(paths, code):
    """Just one building's own drawing -- no roads, kerbs, or neighbours."""
    pat = re.compile(rf'\bA-{code}[-$]')
    return {k: v for k, v in paths.items() if k and pat.search(k)}

if __name__ == '__main__':
    oc2name, streams = load()
    paths = parse(oc2name, streams)
    tot = sum(len(v) for v in paths.values())
    print(f'{tot} polylines across {len(paths)} CAD layers', file=sys.stderr)
    if '--png' in sys.argv:
        from PIL import Image, ImageDraw
        k = sys.argv.index('--png')
        X0, Y0, X1, Y1 = map(float, sys.argv[k+1:k+5]); out = sys.argv[k+5]
        S = 4.0
        W, H = int((X1-X0)*S), int((Y1-Y0)*S)
        im = Image.new('RGB', (W, H), (252, 251, 249)); dr = ImageDraw.Draw(im)
        STYLE = {'fitout': ((185,182,178),1,0), 'glazing': ((70,160,190),2,2),
                 'structure': ((150,140,175),3,1), 'door': ((214,69,58),3,3),
                 'wall': ((22,22,26),3,4)}
        order = collections.defaultdict(list)
        for lay, v in paths.items():
            if lay: order[STYLE[classify(lay)][2]].append((STYLE[classify(lay)], v))
        for z in sorted(order):
            for (col, w, _), v in order[z]:
                for pl in v:
                    pts = [((x-X0)*S, H-(y-Y0)*S) for x, y in pl if X0 <= x <= X1 and Y0 <= y <= Y1]
                    if len(pts) > 1: dr.line(pts, fill=col, width=w)
        im.save(out); print('wrote', out, im.size, file=sys.stderr)
    else:
        json.dump({k: v for k, v in paths.items() if k}, open('paths_all.json', 'w'))
        print('wrote paths_all.json', file=sys.stderr)
