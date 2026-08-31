#!/usr/bin/env python3
"""
Build M4 as a two-floor 3D model from the evacuation-board polygons.

    python3 tools/build_m4.py        # -> m4-data.js

Reads boards-data.js (the auto-detected room polygons, in board-photo pixels)
and emits rooms in METRES, with both floors sharing one origin so they stack.

SCALE, and be honest about it: this is a bounding-box fit, not yet a proper
homography. Each board's room-union box is scaled onto M4's CAD footprint
(43.62 x 30.27 m). That gets sizes right to within a few percent and both
floors into the same frame, which is enough to look at. It does NOT remove the
photograph's perspective. The real registration -- four corresponding corners,
board to CAD -- is the next step, and until it lands every dimension here
carries a few percent of camera distortion.

Names are read off the boards by eye. Two overrides from Evan, who knows the
building: the board's "Copy/Print Centre" is the Music Room, and "Caseroom 2"
is Classroom 8 (so Caseroom 1 is Classroom 7).
"""
import json, re, sys

FLOOR_W, FLOOR_D = 43.62, 30.27      # M4 footprint from the CAD, metres
FLOOR_H = 4.0                        # floor to floor
WALL_H  = 3.2
MIN_M2  = 1.0                        # below this it is an icon, not a room

# index -> (name, type). Read off the boards. Anything not listed stays an
# unnamed service space rather than being guessed at.
NAMES = {
 'M4_G': {
    0:  ('Lectures Hall',      'lecture'),
    1:  ('Computer Laboratory','lab'),
    2:  ('Classroom 3',        'classroom'),
    3:  ('Classroom 1',        'classroom'),
    4:  ('Classroom 5',        'classroom'),
    5:  ('Classroom 6',        'classroom'),
    6:  ('Classroom 4',        'classroom'),
    7:  ('Classroom 2',        'classroom'),
    8:  ('Music Room',         'amenity'),     # board says Copy/Print Centre
    9:  ('Reception',          'office'),
    10: ('Male Toilet',        'toilet'),
    11: ('Female Toilet',      'toilet'),
    12: ('Admin Office',       'office'),
    15: ('Pod Toilet',         'toilet'),
 },
 'M4_L1': {
    1: ('Classroom 8',            'classroom'),   # board says Caseroom 2
    2: ('Classroom 7',            'classroom'),   # board says Caseroom 1
    3: ('Open Workstation',       'office'),
    4: ('Faculty Office',         'office'),
    5: ('Faculty Office (15 rm)', 'office'),
 },
}

# Timetable codes, so a room in 3D can answer "what is on in here right now".
CODES = {
 'M4_G':  {0:'M4-0-005', 1:'M4-0-018', 2:'M4-0-011', 4:'M4-0-019',
           5:'M4-0-021', 6:'M4-0-017', 7:'M4-0-006'},
 'M4_L1': {1:'M4-1-011', 2:'M4-1-017'},
}

# Blobs the detector found that are not rooms: the board background, the
# key-plan thumbnail, slivers of corridor paint outside the plan.
DROP = {'M4_G': set(), 'M4_L1': {0}}


def poly_area(p):
    a = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def main():
    src = open('boards-data.js').read()
    BOARDS = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))

    floors = []
    for level, bid in ((0, 'M4_G'), (1, 'M4_L1')):
        b = BOARDS[bid]
        keep = [r for r in b['rooms'] if r['i'] not in DROP[bid]]
        pts = [p for r in keep for p in r['poly']]
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
        y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        # Fit each board's room-union box onto the SAME target box, scaling the
        # two axes independently. The boards are separate photographs taken at
        # different distances, so a shared uniform scale makes one floor come out
        # visibly bigger than the other and they stop stacking. Forcing both onto
        # one box costs a little aspect accuracy and buys correct alignment --
        # a trade that goes away once the four-corner registration lands.
        sx = FLOOR_W / (x1 - x0)
        sy = FLOOR_D / (y1 - y0)
        s = (sx + sy) / 2
        m = lambda x, y: [round((x - x0) * sx, 2), round((y - y0) * sy, 2)]

        rooms = []
        for r in keep:
            poly = [m(*p) for p in r['poly']]
            a = poly_area(poly)
            if a < MIN_M2: continue
            name, kind = NAMES[bid].get(r['i'], (None, 'service'))
            rooms.append({'i': r['i'], 'name': name, 'kind': kind,
                          'code': CODES[bid].get(r['i']), 'area': round(a, 1),
                          'p': poly})
        rooms.sort(key=lambda r: -r['area'])
        tot = round(sum(r['area'] for r in rooms))
        named = sum(1 for r in rooms if r['name'])
        print(f'{bid}: {len(rooms)} rooms, {named} named, {tot} m2 of floor '
              f'(scale {s:.4f} m/px)')
        for r in rooms[:9]:
            print(f'    {r["area"]:7.1f} m2  {r["name"] or "(unnamed #%d)" % r["i"]}')
        floors.append({'level': level, 'label': b['label'], 'y': level * FLOOR_H,
                       'board': b['img'], 'rooms': rooms})

    data = {'building': 'M4', 'w': FLOOR_W, 'd': FLOOR_D,
            'floorH': FLOOR_H, 'wallH': WALL_H, 'floors': floors}
    js = ('// AUTO-GENERATED by tools/build_m4.py -- do not hand-edit.\n'
          '// Rooms come from the fire-evacuation boards (the source of truth for\n'
          '// layout); scale is a bounding-box fit onto the CAD footprint, so every\n'
          '// dimension still carries a few percent of camera distortion until the\n'
          '// four-corner registration lands. Metres, y-down in plan.\n'
          f'const M4 = {json.dumps(data, separators=(",", ":"))};\n')
    open('m4-data.js', 'w').write(js)
    print(f'\nwrote m4-data.js  {len(js)/1024:.0f} KB')


if __name__ == '__main__':
    main()
