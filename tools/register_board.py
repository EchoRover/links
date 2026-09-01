#!/usr/bin/env python3
"""
Register a photographed evacuation board onto the CAD, so the two sources can
be fused.

    python3 tools/register_board.py M4_G

Why: the CAD has exact walls, doors and columns but no room identity, and stray
linework that splits big rooms. The boards have clean room identity and names
but are photographs -- perspective, glare, missing rooms. Neither alone is
enough. Put them in the same coordinate frame and each fixes the other's gap.

Method: both sources give a silhouette of the same building. Sweep rotation,
match areas to fix scale, align centroids, score by IoU; take the best, then
refine with ECC to an affine that absorbs the camera's tilt. Everything is
reported so a bad fit is visible rather than silent.
"""
import json, math, sys
import numpy as np, cv2

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from extract_floorplan import load, parse, classify, building_layers

PPM = 6.0          # raster pixels per metre for the alignment
M_PER_UNIT = 0.1177


def cad_silhouette(code):
    """Solid footprint of one building from its CAD layers, in metres."""
    oc2name, streams = load()
    allp = parse(oc2name, streams)
    own = building_layers(allp, code)
    seg = [pl for k, v in own.items() if classify(k) in ('wall', 'glazing', 'structure')
           for pl in v]
    pts = [p for pl in seg for p in pl]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    W = int((x1 - x0) * M_PER_UNIT * PPM) + 20
    H = int((y1 - y0) * M_PER_UNIT * PPM) + 20
    img = np.zeros((H, W), np.uint8)
    for pl in seg:
        q = np.array([[int((x - x0) * M_PER_UNIT * PPM) + 10,
                       int(H - 10 - (y - y0) * M_PER_UNIT * PPM)] for x, y in pl], np.int32)
        cv2.polylines(img, [q], False, 255, 2)
    # Seal only doorway-and-entrance sized gaps. Swept: at 1.2-3.0 m M4 comes out
    # as a clean 1,050 m2 stepped shape; at 4.5 m and above the flood fill escapes
    # the envelope and the footprint balloons to 1,630 m2 of nonsense.
    k = int(2.0 * PPM) | 1
    img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    ff = img.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    solid = cv2.bitwise_or(img, cv2.bitwise_not(ff))
    out = np.zeros((H, W), np.uint8)
    c = max(cv2.findContours(solid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    cv2.drawContours(out, [c], -1, 255, -1)
    return out, (x0, y0, x1, y1)


def sil_palette(img, rooms):
    """The building's true footprint as drawn on the board -- corridors included.

    Not the union of detected rooms: that misses every corridor and reads as a
    shape with a bite out of it, which no similarity transform can reconcile
    against the CAD.

    Not a darkness threshold either: that works on one board and fails on the
    next, because each board is a separate photograph under different light.

    What is stable across all of them is the palette. These boards draw rooms in
    one fill and circulation in another, both distinct from the board's own pale
    background. So: cluster the colours, call the cluster that dominates the
    frame edges the background, and the building is everything else.
    """
    H, W = img.shape[:2]
    Z = img.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, lab, _ = cv2.kmeans(Z, 6, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    lab = lab.reshape(H, W)

    edge = np.zeros((H, W), bool)
    t = max(4, int(min(H, W) * 0.02))
    edge[:t] = edge[-t:] = True
    edge[:, :t] = edge[:, -t:] = True
    # More than one cluster can be background: the pale field, the white margin,
    # and the blank area inside the plan's bounding box but outside the building
    # often split. Taking only the single commonest leaves the rest counted as
    # building and the footprint balloons to 70% of the frame.
    cnt = np.bincount(lab[edge].ravel(), minlength=6).astype(float)
    cnt /= cnt.sum()
    bg = {k for k in range(6) if cnt[k] > 0.12}
    m = ((~np.isin(lab, list(bg))).astype(np.uint8)) * 255
    for r in rooms:                                   # rooms are inside it too
        cv2.fillPoly(m, [np.array(r['poly'], np.int32)], 255)
    k = int(W * 0.012) | 1
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))

    n, cl, st, _ = cv2.connectedComponentsWithStats(m, 8)
    i = 1 + int(np.argmax(st[1:, 4]))
    mm = ((cl == i) * 255).astype(np.uint8)
    ff = mm.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    mm = cv2.bitwise_or(mm, cv2.bitwise_not(ff))
    out = np.zeros((H, W), np.uint8)
    c = max(cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    cv2.drawContours(out, [c], -1, 255, -1)
    return out


def sil_dark(img, rooms, pct):
    """Footprint from the drawn wall linework, looked for only near the rooms.

    The board's own printed border is dark too, so searching the whole frame
    finds the frame. Works well on some boards and not others -- which is why
    the caller tries this AND sil_palette and keeps whichever registers better.
    """
    H, W = img.shape[:2]
    roi = np.zeros((H, W), np.uint8)
    for r in rooms:
        cv2.fillPoly(roi, [np.array(r['poly'], np.int32)], 255)
    roi = cv2.dilate(roi, cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (int(W * 0.055) | 1,) * 2))
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    dark = ((g < np.percentile(g[roi > 0], pct)) & (roi > 0)).astype(np.uint8) * 255
    k = int(W * 0.010) | 1
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, ker, iterations=2)
    for r in rooms:
        cv2.fillPoly(m, [np.array(r['poly'], np.int32)], 255)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ker)
    n, cl, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n < 2: return None
    i = 1 + int(np.argmax(st[1:, 4]))
    mm = ((cl == i) * 255).astype(np.uint8)
    ff = mm.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    mm = cv2.bitwise_or(mm, cv2.bitwise_not(ff))
    out = np.zeros((H, W), np.uint8)
    c = max(cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    cv2.drawContours(out, [c], -1, 255, -1)
    return out


def candidates(img, rooms):
    """Every plausible footprint, so the caller can let IoU decide."""
    out = [('palette', sil_palette(img, rooms))]
    for pct in (14, 20, 26, 32):
        m = sil_dark(img, rooms, pct)
        if m is not None: out.append((f'dark{pct}', m))
    # a silhouette that swallows the frame is the background, not a building
    return [(n, m) for n, m in out if m is not None and 0.15 < (m > 0).mean() < 0.80]


def iou(a, b):
    i = np.logical_and(a > 0, b > 0).sum()
    u = np.logical_or(a > 0, b > 0).sum()
    return i / u if u else 0.0


def coarse(src, dst):
    """Best rotation + uniform scale + translation of src onto dst, by IoU.

    The translation has to be folded into the matrix BEFORE the first warp. The
    board raster is ~1200 px and the CAD canvas ~300 px, so rotating about the
    board's own centre lands the whole thing outside the output and every angle
    scores an empty image.
    """
    ha, wa = dst.shape
    sa, sb = (src > 0).sum(), (dst > 0).sum()
    dcy, dcx = np.argwhere(dst > 0).mean(axis=0)
    scy, scx = np.argwhere(src > 0).mean(axis=0)
    s = math.sqrt(sb / sa)
    best = None
    for deg in range(0, 360, 1):
        M = cv2.getRotationMatrix2D((float(scx), float(scy)), deg, s)
        # where the source centroid lands under M, then shift it onto dst's
        M[0, 2] += dcx - (M[0, 0] * scx + M[0, 1] * scy + M[0, 2])
        M[1, 2] += dcy - (M[1, 0] * scx + M[1, 1] * scy + M[1, 2])
        warp = cv2.warpAffine(src, M, (wa, ha), flags=cv2.INTER_NEAREST)
        sc = iou(warp, dst)
        if best is None or sc > best[0]: best = (sc, deg, M.copy())
    return best


def main(board_id):
    src = open('data/boards-data.js').read()
    BOARDS = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))
    b = BOARDS[board_id]

    cad, ext = cad_silhouette(b['building'])
    photo = cv2.imread(b['img'])
    if photo is None: sys.exit(f"cannot read {b['img']}")
    photo = cv2.resize(photo, (b['w'], b['h']))
    cands = candidates(photo, b['rooms'])
    if not cands: sys.exit('no usable board silhouette')
    print(f'CAD silhouette {cad.shape[1]}x{cad.shape[0]} px '
          f'({(cad > 0).sum() / PPM**2:,.0f} m2)')
    print(f'{len(cands)} candidate footprints: ' + ', '.join(n for n, _ in cands))

    picked = None
    for name, cand in cands:
        got = coarse(cand, cad)
        if got and (picked is None or got[0] > picked[0]):
            picked = (got[0], got[1], got[2], name, cand)
    sc, deg, M, which, brd = picked
    print(f'best coarse: {which}, rotate {deg}deg, IoU {sc:.3f}')

    # Refine by hill-climbing the overlap directly. ECC on hard-edged binary
    # silhouettes either refuses to converge or wanders off while still
    # reporting a high correlation, and the coarse scale is set by matching
    # areas -- which is wrong here, because the board's silhouette is a union of
    # rooms and so misses the corridor the CAD includes.
    def build(deg, sc, dx, dy, ar=1.0):
        # ar stretches x against y. A photograph or a redraw is never a perfect
        # similarity of the CAD -- the camera tilt and the redraw's own proportions
        # leave one axis slightly long, which a uniform scale cannot absorb and
        # which shows up as a red fringe down one side of the overlay.
        Mx = cv2.getRotationMatrix2D((float(scx), float(scy)), deg, sc)
        Mx = np.array([[ar, 0, 0], [0, 1 / ar, 0]], np.float32) @ np.vstack([Mx, [0, 0, 1]])
        Mx[0, 2] += dcx + dx - (Mx[0, 0] * scx + Mx[0, 1] * scy + Mx[0, 2])
        Mx[1, 2] += dcy + dy - (Mx[1, 0] * scx + Mx[1, 1] * scy + Mx[1, 2])
        return Mx

    sa, sb = (brd > 0).sum(), (cad > 0).sum()
    scy, scx = np.argwhere(brd > 0).mean(axis=0)
    dcy, dcx = np.argwhere(cad > 0).mean(axis=0)
    P = [float(deg), math.sqrt(sb / sa), 0.0, 0.0, 1.0]     # deg, scale, dx, dy, aspect
    step = [3.0, 0.10, 12.0, 12.0, 0.05]
    score = lambda p: iou(cv2.warpAffine(brd, build(*p), (cad.shape[1], cad.shape[0]),
                                         flags=cv2.INTER_NEAREST), cad)
    cur = score(P)
    for _ in range(90):
        improved = False
        for i in range(5):
            for d in (+1, -1):
                q = P.copy(); q[i] += d * step[i]
                v = score(q)
                if v > cur + 1e-5: P, cur, improved = q, v, True
        if not improved:
            step = [x * 0.5 for x in step]
            if max(step) < 0.02: break
    print(f'refined: rotate {P[0]:.1f}deg, scale {P[1]:.4f}, shift ({P[2]:.1f},{P[3]:.1f}) px, aspect {P[4]:.3f}')
    warp = build(*P)
    fitted = cv2.warpAffine(brd, warp, (cad.shape[1], cad.shape[0]), flags=cv2.INTER_NEAREST)
    final = cur
    print(f'FINAL IoU {final:.3f}   ' +
          ('good' if final > 0.90 else 'usable' if final > 0.80 else 'POOR -- do not build on this'))

    # Save the fitted board silhouette: the CAD footprint is not always complete
    # (M3's misses the wing holding the Physics Lab), and the fuse step unions
    # the two so the board can fill in what the CAD lacks.
    cv2.imwrite(f'/tmp/reg_{board_id}_fit.png', fitted)

    ov = np.zeros((cad.shape[0], cad.shape[1], 3), np.uint8)
    ov[..., 1] = cad; ov[..., 2] = fitted
    cv2.imwrite(f'/tmp/reg_{board_id}.png', ov)
    json.dump({'board': board_id, 'affine': warp.tolist(), 'iou': float(final),
               'ppm': PPM, 'cad_ext': ext, 'cad_shape': list(cad.shape)},
              open(f'/tmp/reg_{board_id}.json', 'w'))
    print(f'-> /tmp/reg_{board_id}.png (green = CAD, red = board, yellow = agreement)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'M4_G')
