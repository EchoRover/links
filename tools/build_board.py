#!/usr/bin/env python3
"""
Pull room polygons off a photographed fire-evacuation board.

    python3 tools/build_board.py <photo.png> <out-prefix>

Why the boards and not the CAD: the boards ARE the source of truth for layout.
The CAD has stray linework inside the big rooms that keeps fooling a flood fill
into cutting one hall into three, and it carries no room names at all. The
boards are already a simplified, labelled plan -- every room is a flat fill
bounded by a dark wall, which segments almost perfectly.

The CAD is still what gives real-world scale; see M_PER_UNIT in build_floor.py
and the registration step that follows this one.
"""
import json, sys
import numpy as np, cv2

K          = 6       # colour clusters; the boards use ~4 fills plus ink and glare
MIN_PX     = 700     # smaller than this is an icon or a sliver of wall
MAX_FRAC   = 0.42    # bigger than this is the board itself, not a room


def room_blobs(img):
    """Every room on the board, across ALL the fills it uses.

    The boards do not use one room colour. On M4 Level 01 the Library and both
    conference rooms are a different fill from the classrooms, so taking a single
    cluster loses them -- which is what left that floor with 5 rooms named out of
    twenty and a 844 m2 "corridor" that was really unmapped space.

    So: cluster the colours, then accept EVERY cluster that breaks into several
    room-sized blobs, and collect the blobs from all of them. Background makes one
    huge blob and ink makes thousands of tiny ones, so neither qualifies.
    """
    H, W = img.shape[:2]
    Z = img.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, lab, cen = cv2.kmeans(Z, K, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    lab = lab.reshape(H, W)

    # No frame-edge test here. On the M4 Level-01 board the plan runs right up to
    # the edge, so the room fill itself dominates that band and gets thrown away
    # as "background" -- which silently drops the biggest rooms on the floor. The
    # size and shape tests below already reject background: it is one blob larger
    # than MAX_FRAC, and ink is thousands smaller than MIN_PX.
    out = []
    for k in range(K):
        m = ((lab == k).astype(np.uint8)) * 255
        # Walls here are ~6 px wide, so ANY closing welds neighbours together.
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, L, st, _ = cv2.connectedComponentsWithStats(m, 4)
        good = []
        for i in range(1, n):
            x, y, w, h, a = st[i]
            if not (MIN_PX < a < MAX_FRAC * H * W): continue
            # Separate a room from the wall linework that a second fill drags in.
            # Compactness is the wrong test: it throws away real rooms. A toilet
            # full of cubicle partitions is deeply concave and scores like a ring,
            # which is why M3's Male Toilet vanished entirely and the Female one
            # came out ragged.
            #
            # What actually distinguishes them is a HOLE. Wall linework forms an
            # annulus around a room; a room, however concave, is solid.
            sub = (L[y:y + h, x:x + w] == i).astype(np.uint8)
            cs, hier = cv2.findContours(sub, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            outer = max(range(len(cs)), key=lambda j: cv2.contourArea(cs[j]))
            oa = cv2.contourArea(cs[outer])
            holes = sum(cv2.contourArea(cs[j]) for j in range(len(cs))
                        if hier[0][j][3] == outer)
            if oa and holes / oa > 0.15: continue          # an annulus: wall, not room
            hull = cv2.contourArea(cv2.convexHull(cs[outer]))
            # A loose solidity floor still earns its keep against L-shaped wall
            # slivers, but it has to be LOOSE: M3's Male Toilet scores 0.71 and
            # the old 0.72 threshold deleted the room by one hundredth.
            if hull and oa / hull < 0.55: continue
            if min(w, h) < 12: continue                    # a hairline sliver
            good.append(i)
        if len(good) < 2:                   # not a room fill
            continue
        for i in good:
            out.append((L == i, st[i]))
    return out


def stair_blobs(img):
    """Stairs, which the room pass cannot see.

    They are drawn in a saturated dark green rather than a pale room fill, and
    their tread lines chop them into slivers, so they either fall in a cluster of
    their own or survive only as fragments. They matter more than most rooms --
    they are what connects the floors -- so they get their own pass: pick the
    dark-green pixels, close across the treads, and take what is left.
    """
    H, W = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, sat, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    m = (((h >= 35) & (h <= 90) & (sat >= 60) & (v >= 40) & (v <= 175))).astype(np.uint8) * 255
    k = max(3, int(W * 0.010) | 1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, L, st, _ = cv2.connectedComponentsWithStats(m, 8)
    out = []
    for i in range(1, n):
        x, y, w, hh, a = st[i]
        if not (MIN_PX < a < 0.06 * H * W): continue      # a stair, not a lawn
        if min(w, hh) < 14: continue
        out.append((L == i, st[i]))
    return out


def main(path, prefix):
    img = cv2.imread(path)
    if img is None: sys.exit(f'cannot read {path}')
    H, W = img.shape[:2]
    blobs = room_blobs(img)
    if not blobs: sys.exit('no room fills found')
    # a blob may be found twice if two clusters straddle the same fill; keep the
    # first and drop anything that mostly overlaps an already-kept room
    kept = []
    for mask, st in sorted(blobs, key=lambda t: -t[1][4]):
        if any(np.logical_and(mask, km).sum() > 0.5 * mask.sum() for km, _ in kept):
            continue
        kept.append((mask, st))
    nrooms = len(kept)
    # Stairs go on the END of the list so adding them never shifts a room index.
    stairs = []
    for mask, st in stair_blobs(img):
        if any(np.logical_and(mask, km).sum() > 0.5 * mask.sum() for km, _ in kept): continue
        kept.append((mask, st)); stairs.append(len(kept) - 1)
    tot = sum(st[4] for _, st in kept)
    print(f'{path}: {W}x{H}, {nrooms} rooms + {len(stairs)} stairs, {tot/(H*W)*100:.0f}% of frame')

    vis = img.copy()
    out = []
    for r, (mask, st_) in enumerate(kept):
        mu8 = mask.astype(np.uint8)
        c = max(cv2.findContours(mu8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
        ap = cv2.approxPolyDP(c, 0.010 * cv2.arcLength(c, True), True).reshape(-1, 2)
        x, y, w, h, a = st_
        sub = mu8[y:y + h, x:x + w]
        dt = cv2.distanceTransform(cv2.copyMakeBorder(sub, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0),
                                   cv2.DIST_L2, 5)
        _, _, _, mx = cv2.minMaxLoc(dt)
        cx, cy = x + mx[0] - 1, y + mx[1] - 1
        out.append({'i': r, 'px': int(a), 'share': round(a / tot, 4),
                    'anchor': [int(cx), int(cy)], 'poly': ap.tolist(),
                    **({'kind': 'stair'} if r in stairs else {})})
        cv2.drawContours(vis, [ap.reshape(-1, 1, 2)], -1, (0, 0, 255), 3)
        cv2.circle(vis, (cx, cy), 18, (255, 255, 255), -1)
        cv2.circle(vis, (cx, cy), 18, (0, 0, 0), 2)
        cv2.putText(vis, str(r), (cx - (8 if r < 10 else 16), cy + 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        print(f'   #{r:2}  {a:7d} px  {a/tot*100:5.1f}%  {len(ap):2} corners  bbox {w:4}x{h:4}')

    cv2.imwrite(prefix + '.png', vis)
    json.dump({'src': path, 'w': W, 'h': H, 'rooms': out}, open(prefix + '.json', 'w'))
    print(f'   -> {prefix}.png  {prefix}.json')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
