#!/usr/bin/env python3
"""Score the parse of EVERY sheet against that sheet's own L-T-P-C table.

This is the test suite for tools/parse_timetable.py, and it needs no
ground truth I have to write: the credit table is printed on the sheet,
it is the half the grid was never transcribed from, and it says exactly
how many lecture / tutorial / practical hours each course must have.

Why it exists: the parser was being judged on ONE sheet (Year 3 CSE, the
only one with a hand-verified week to diff against), scored 23/23 there,
and that number was quoted as if it described all seventeen. It did not.
Across every sheet with a credit table it was 46 of 89 courses.

RECONCILE PER GROUP, not per course. A 3-1-0-4 course has ONE tutorial
hour in the curriculum, taught twice -- once to group 1, once to group 2.
Summing both gives 2h and reports the course as over by +1T on every
single HUL course on every sheet. That was a bug in the SCORE, not the
parse, and it made the parser look worse than it is. A group 0 block
counts for everyone; a group N block counts only in group N's week.

Usage:  python3 tools/score_parse.py [parsed.json]
Exit code is the number of courses that do not reconcile, so it is CI-able.
"""
import json
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIN_PER_HOUR = 50
BUCKET = {"": "L", "tut": "T", "lab": "P", "proj": "P"}


def mins(a, b):
    if not a or not b:
        return 0
    ah, am = (int(x) for x in a.split(":"))
    bh, bm = (int(x) for x in b.split(":"))
    return (bh * 60 + bm) - (ah * 60 + am)


def nominal(m):
    return round(m / MIN_PER_HOUR)


def score_course(rows, ltpc):
    """Worst gap over the groups this course is actually taught to."""
    groups = sorted({r.get("group") or 0 for r in rows} - {0}) or [0]
    want = {"L": ltpc[0], "T": ltpc[1], "P": ltpc[2]}
    worst = None
    for g in groups:
        have = {"L": 0, "T": 0, "P": 0}
        for r in rows:
            rg = r.get("group") or 0
            if rg not in (0, g):
                continue
            have[BUCKET.get(r.get("kind") or "", "L")] += mins(r["start"], r["end"])
        gap = {k: nominal(have[k]) - want[k] for k in "LTP"}
        bad = sum(abs(v) for v in gap.values())
        if worst is None or bad > worst[0]:
            worst = (bad, g, gap)
    return worst[2], worst[1]


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 \
        else ROOT / "data" / "timetables" / "parsed.json"
    data = json.loads(src.read_text())

    total = ok = 0
    unscorable = []
    for name in sorted(data):
        v = data[name]
        courses = v.get("courses") or {}
        scorable = {c: x for c, x in courses.items() if x.get("ltpc")}
        if not scorable:
            unscorable.append(name)
            continue
        rows = [b for b in v["blocks"] if b.get("course")]
        bad, absent = [], []
        for code, c in scorable.items():
            mine = [r for r in rows if r["course"] == code]
            # A course in the credit table with NOTHING on the grid is a
            # fact about the SHEET, not a parse failure -- the 7 September
            # revision really did drop AHSL2062 and AHSL2675 from the week
            # while leaving them in the course table. Scoring those as
            # parser errors buries the errors that are mine.
            if not mine:
                absent.append((code, "-".join(map(str, c["ltpc"])), c.get("title", "")))
                continue
            gap, g = score_course(mine, c["ltpc"])
            total += 1
            if any(gap.values()):
                bad.append((code, "-".join(map(str, c["ltpc"])), gap, len(mine), g))
            else:
                ok += 1
        n = len(scorable) - len(absent)
        print(f"{name:44s}  {n - len(bad):2d}/{n:2d}"
              + (f"   ({len(absent)} declared, never scheduled)" if absent else ""))
        for code, ltpc, gap, cnt, g in bad:
            d = " ".join(f"{'+' if gap[k] > 0 else ''}{gap[k]}{k}" for k in "LTP" if gap[k])
            print(f"       {code:9s} {ltpc:9s} {d:14s} ({cnt} blocks, worst in g{g})")
        for code, ltpc, title in absent:
            print(f"       {code:9s} {ltpc:9s} NOT ON THE GRID  {title[:34]}")

    for name in unscorable:
        print(f"{name:44s}  -- no credit table, cannot score")

    print(f"\nTOTAL: {ok}/{total} courses reconcile "
          f"({len(unscorable)} sheets unscorable)")
    return total - ok


if __name__ == "__main__":
    sys.exit(main())
