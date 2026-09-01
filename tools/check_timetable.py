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

    if failures:
        print("MISMATCH - suspect the transcription before you suspect this check:\n")
        for f in failures:
            print("  " + f)
        return 1

    covered = ", ".join(sorted(credits))
    print(f"OK - every course reconciles in both groups: {covered}")
    print("(ACOD310 is allowed to be under-scheduled: 0-0-6-3, one slot reserved.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
