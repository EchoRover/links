#!/usr/bin/env python3
"""Reconcile js/timetable.js against the official PDF's L-T-P-C table.

Why this exists
---------------
Re-reading a timetable grid does not catch transcription errors, because
you re-read it the same wrong way. What catches them is an invariant taken
from a DIFFERENT part of the source than the part you transcribed.

The sheet has two independent halves:
  * the week grid   -> transcribed by hand into WEEK in js/timetable.js
  * the course table -> Course / Title / L-T-P-C / Faculty, never transcribed

So the credit table is free to be used as a check. Sum each course's
scheduled minutes by kind, convert to nominal contact hours, and compare
against the L-T-P-C the sheet itself prints.

This already earned its keep once: it is what identified Tuesday's
unlabelled 110-minute block in a computer lab as ACOL333's practical
hours. The sheet prints no "Lab" caption there, so reading it gives you a
lecture, confidently, every time. The credits knew better.

Since 2026-09-02 it also checks two things the credit table cannot see,
both added because they were missed in production:

  * every BLOCK, rebuilt from the PDF by word coordinate and diffed
    against WEEK -- day, start, end, course, room code.
  * every ROOM NAME in ROOMS, read off the sheet. The 27 August revision
    renamed M4-0-019 from "Classroom 5" to "Classroom 3" WITHOUT changing
    the room code, so a diff of courses/times/codes called that revision a
    no-op and the page kept showing the old name. A rename is invisible to
    every check that only looks at codes.

Usage:
    python3 tools/check_timetable.py                 # newest sheet in data/timetables
    python3 tools/check_timetable.py <sheet.pdf>
Exit code is 1 on any mismatch, so this is CI-able.
"""
import re
import sys
import pathlib

try:
    import pdfplumber
except ImportError:
    sys.exit("needs pdfplumber:  pip install pdfplumber")

ROOT = pathlib.Path(__file__).resolve().parent.parent
TT_JS = ROOT / "js" / "timetable.js"
SHEETS = ROOT / "data" / "timetables"

# A ":50" slot is one nominal contact hour, so minutes convert at 60/50.
MIN_PER_HOUR = 50

# Blocks whose scheduled time is deliberately less than the credits claim.
# ACOD310 is 0-0-6-3 but the sheet reserves only one 110-minute slot; the
# rest of the project hours are unscheduled self-directed work.
PARTIALLY_SCHEDULED = {"ACOD310"}


def parse_week(js_text):
    """Pull WEEK out of timetable.js. Returns [(course, kind, minutes, group)]."""
    block = re.search(r"const WEEK = \{(.*?)\n\};", js_text, re.S)
    if not block:
        sys.exit("could not find `const WEEK = {` in timetable.js")
    rows = []
    entry = re.compile(
        r'\["(\d\d:\d\d)",\s*"(\d\d:\d\d)",\s*"([A-Z]+\d+)",\s*"([^"]*)",\s*"([^"]*)",\s*(\d)\]'
    )
    for start, end, course, _room, kind, group in entry.findall(block.group(1)):
        h1, m1 = map(int, start.split(":"))
        h2, m2 = map(int, end.split(":"))
        rows.append((course, kind or "lec", (h2 * 60 + m2) - (h1 * 60 + m1), int(group)))
    return rows


def parse_credits(pdf_path):
    """Pull {course: (L, T, P)} from the sheet's own course table."""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
    out = {}
    for code, l, t, p, _c in re.findall(
        r"\b([A-Z]{4}\d{3})\b[^\n]*?(\d+)-(\d+)-(\d+)-(\d+)", text
    ):
        out[code] = (int(l), int(t), int(p))
    if not out:
        sys.exit(f"no L-T-P-C rows found in {pdf_path.name} - is it the right sheet?")
    return out


def nominal_hours(minutes):
    return round(minutes / MIN_PER_HOUR)


TIME_TOK = re.compile(r"^\d{1,2}:\d{2}$")
COURSE_TOK = re.compile(r"^[A-Z]{4}\d{3}$")
ROOM_TOK = re.compile(r"^M[34][-.]\d[-.]\d{3}$")
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")


def parse_sheet_blocks(pdf_path):
    """Rebuild every block from the PDF by word coordinate.

    Independent of how a human reads the grid, which is the point: it is a
    second derivation, not a second reading.
    """
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        words = page.extract_words()
    day_tops = {w["text"]: w["top"] for w in words if w["text"] in DAYS}
    words.sort(key=lambda w: (round(w["top"], 1), w["x0"]))

    # "10:00", "-", "10:50" -> one span
    spans = []
    for i, w in enumerate(words):
        if not TIME_TOK.match(w["text"]) or i + 2 >= len(words):
            continue
        dash, end = words[i + 1], words[i + 2]
        if dash["text"] != "-" or not TIME_TOK.match(end["text"]):
            continue
        if abs(end["top"] - w["top"]) >= 3:
            continue
        spans.append({"start": w["text"], "end": end["text"],
                      "x0": w["x0"], "x1": end["x1"], "top": w["top"]})

    def room_label_at(anchor):
        line = sorted((y for y in words if abs(y["top"] - anchor["top"]) < 3
                       and y["x0"] >= anchor["x0"]), key=lambda y: y["x0"])
        phrase = []
        for y in line:
            phrase.append(y["text"])
            if re.fullmatch(r"\d{1,2}", y["text"]) or len(phrase) > 4:
                break
        return " ".join(phrase)

    blocks, labels = [], {}
    for sp in spans:
        column = [w for w in words if -62 < w["top"] - sp["top"] < 0
                  and w["x0"] < sp["x1"] + 6 and w["x1"] > sp["x0"] - 6]
        column.sort(key=lambda w: -w["top"])
        course = room = None
        for w in column:
            if course is None and COURSE_TOK.match(w["text"]):
                course = w["text"]
            if room is None and ROOM_TOK.match(w["text"]):
                room = w["text"]
        # Second pass: the label sits BELOW the code, so it is reached
        # before the code in this ordering and cannot be paired inline.
        if room:
            for w in column:
                if w["text"] in ("M4-Classroom", "M3-Computer"):
                    labels.setdefault(room, room_label_at(w))
                    break
        if not course:
            continue
        # A day's band runs from its label down to the next one, and the
        # bands overlap slightly, so "first label within range" silently
        # picks the day above. Take the NEAREST label at or above instead.
        above = [(top, d) for d, top in day_tops.items() if sp["top"] - top > -20]
        day = max(above)[1] if above else None
        blocks.append((day, hhmm(sp["start"]), hhmm(sp["end"]), course, room))
    return blocks, labels


def hhmm(t):
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


def parse_rooms(js_text):
    """{code: printed name} as ROOMS in timetable.js believes it."""
    block = re.search(r"const ROOMS = \{(.*?)\n\};", js_text, re.S)
    if not block:
        sys.exit("could not find `const ROOMS = {` in timetable.js")
    out, conflicts = {}, []
    for code, bldg, no, lab in re.findall(
        r'"([^"]+)":\s*\{\s*bldg:\s*"([^"]+)",\s*floor:\s*"[^"]*",\s*no:\s*"([^"]+)"(.*?)\}',
        block.group(1),
    ):
        kind = "Computer Lab" if "lab: true" in lab else "Classroom"
        key, name = code.replace(".", "-"), f"{bldg}-{kind} {no}"
        # M4.0.019 and M4-0-019 are the same room spelled two ways. If they
        # ever disagree, the later one used to silently overwrite the
        # earlier and this check passed while the page was wrong -- which
        # is exactly how the Classroom 5 regression survived its own test.
        if key in out and out[key] != name:
            conflicts.append(f"     {key}: ROOMS spells it two ways that disagree "
                             f"('{out[key]}' vs '{name}') - fix both")
        out[key] = name
    return out, conflicts


def parse_week_blocks(js_text):
    """WEEK as (day, start, end, course, room), for the block-level diff."""
    block = re.search(r"const WEEK = \{(.*?)\n\};", js_text, re.S)
    out = []
    day_of = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday"}
    current = None
    for line in block.group(1).splitlines():
        m = re.match(r"\s*(\d):\s*\[", line)
        if m:
            current = day_of[int(m.group(1))]
        e = re.search(r'\["(\d\d:\d\d)",\s*"(\d\d:\d\d)",\s*"([A-Z]+\d+)",\s*"([^"]*)"', line)
        if e:
            out.append((current, e.group(1), e.group(2), e.group(3), e.group(4) or None))
    return out


def main():
    sheet = (
        pathlib.Path(sys.argv[1])
        if len(sys.argv) > 1
        else sorted(SHEETS.glob("*year3-sem5-btech-cse.pdf"))[-1]
    )
    print(f"grid  <- {TT_JS.relative_to(ROOT)}")
    print(f"check <- {sheet.name}\n")

    week = parse_week(TT_JS.read_text())
    credits = parse_credits(sheet)

    # Group 2's week is the same as group 1's apart from the HUL tutorials,
    # so reconcile each group separately: a course must add up in both.
    failures = []
    for group in (1, 2):
        got = {}
        for course, kind, minutes, g in week:
            if g not in (0, group):
                continue
            bucket = {"tut": "T", "lab": "P", "proj": "P"}.get(kind, "L")
            got.setdefault(course, {"L": 0, "T": 0, "P": 0})[bucket] += minutes

        for course, (want_l, want_t, want_p) in sorted(credits.items()):
            if course not in got:
                failures.append(f"G{group}  {course}: in the credit table but never scheduled")
                continue
            mins = got[course]
            for bucket, want in (("L", want_l), (("T"), want_t), ("P", want_p)):
                have = nominal_hours(mins[bucket])
                if have == want:
                    continue
                if course in PARTIALLY_SCHEDULED and have < want:
                    continue
                failures.append(
                    f"G{group}  {course} {bucket}: sheet says {want}h, "
                    f"grid has {mins[bucket]}min = {have}h"
                )

    for course in sorted({c for c, _k, _m, _g in week}):
        if course not in credits:
            failures.append(f"     {course}: scheduled in the grid but not in the credit table")

    # --- block-level diff: the sheet rebuilt by coordinate vs WEEK ---
    sheet_blocks, sheet_labels = parse_sheet_blocks(sheet)
    js_blocks = parse_week_blocks(TT_JS.read_text())
    only_sheet = sorted(set(sheet_blocks) - set(js_blocks))
    only_js = sorted(set(js_blocks) - set(sheet_blocks))
    for b in only_sheet:
        failures.append(f"     on the sheet but not in WEEK: {b}")
    for b in only_js:
        failures.append(f"     in WEEK but not on the sheet: {b}")

    rooms, room_conflicts = parse_rooms(TT_JS.read_text())
    failures.extend(room_conflicts)

    # --- the same room name lives in three files; they drifted once ---
    # timetable.js ROOMS, rooms-data.js ROOM_NAMES and campus-tools-data.js
    # all name M4-0-019. In Sep 2026 all three said "Classroom 5" while the
    # sheet said "Classroom 3", because fixing one never touched the others.
    for rel, pattern in (
        ("data/rooms-data.js", r'"([^"]+)":\s*"((?:Classroom|Computer Lab|Lecture Hall)[^"]*)"'),
        ("data/campus-tools-data.js", r'"([^"]+)":\s*"((?:Classroom|Computer Lab|Lecture Hall)[^"]*)"'),
    ):
        path = ROOT / rel
        if not path.exists():
            continue
        for code, name in re.findall(pattern, path.read_text()):
            ours = rooms.get(code.replace(".", "-"))
            if ours is None:
                continue
            # ROOMS stores "M4-Classroom 3"; these files store "Classroom 3"
            short = ours.split("-", 1)[1] if "-" in ours else ours
            if short.split() != name.split():
                failures.append(
                    f"     {code}: {rel} says '{name}', timetable.js ROOMS says '{short}'"
                )

    # --- room NAMES: a rename does not touch the room code ---
    for code, printed in sorted(sheet_labels.items()):
        ours = rooms.get(code)
        if ours is None:
            failures.append(f"     {code}: on the sheet but missing from ROOMS")
        elif ours.replace("-", " ").split() != printed.replace("-", " ").split():
            failures.append(f"     {code}: sheet prints '{printed}', ROOMS says '{ours}'")

    if failures:
        print("MISMATCH - suspect the transcription before you suspect this check:\n")
        for f in failures:
            print("  " + f)
        return 1

    covered = ", ".join(sorted(credits))
    print(f"OK - {len(sheet_blocks)} blocks match, {len(sheet_labels)} room names match")
    print(f"OK - every course reconciles in both groups: {covered}")
    print("(ACOD310 is allowed to be under-scheduled: 0-0-6-3, one slot reserved.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
