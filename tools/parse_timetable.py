#!/usr/bin/env python3
"""Machine first pass over a timetable PDF -> reviewable JSON.

Why this is not check_timetable.py
----------------------------------
`check_timetable.py` VERIFIES an already-transcribed week against the
sheet. This one PRODUCES the first draft, so a human is editing instead
of typing. Different job, opposite direction, and a much lower bar: it
does not have to be right, it has to be right about how right it is.

Why this is not the word-coordinate reader either
-------------------------------------------------
`check_timetable.parse_sheet_blocks()` finds blocks by pairing "10:00",
"-", "10:50" tokens and then looking upward for a course code. That works
on the Year 3 / M.Tech sheets, which print each block's own span inside
the block. It silently returns ZERO blocks on the Year 1 and Year 2
B.Tech sheets, which are laid out completely differently: a ruler of
half-hour columns across the top, and blocks placed by which columns they
span, printing no time of their own. Measured 2026-09-08: 7 of the 13
sheets in data/timetables parse, 6 return nothing at all.

Returning nothing is the dangerous failure. An empty list from a "parse
the timetable" tool does not look like an error, it looks like a week
with no classes, and it would be believed.

So this reads the PDF's actual table structure (pdfplumber's
`find_tables`), which both layouts have: ruled cells, with merges. A
block that spans four half-hour columns IS one merged cell four columns
wide, so its end time is read off the ruler rather than inferred. The
same code covers both layouts because both are tables.

What it deliberately does NOT do
--------------------------------
It does not guess. Anything ambiguous is emitted with a flag and left for
the human, because the entire point of a human-in-the-loop pass is that
the machine's uncertainty survives to the person reviewing it. A parser
that quietly picks the likeliest reading gives you a clean-looking file
with errors buried in it, which is worse than the typing it replaced.
See lessons/transcription_needs_an_invariant.

Usage
-----
    python3 tools/parse_timetable.py                       # every sheet
    python3 tools/parse_timetable.py <sheet.pdf>           # one sheet
    python3 tools/parse_timetable.py <sheet.pdf> -o out.json

Output is JSON on stdout (or -o), and a coverage report on stderr. Exit
code is 1 if any sheet produced no blocks at all, so a layout this does
not understand fails loudly instead of looking like an empty week.
"""
import re
import sys
import json
import pathlib

try:
    import pdfplumber
except ImportError:
    sys.exit("needs pdfplumber:  pip install pdfplumber")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEETS = ROOT / "data" / "timetables"

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
        "Saturday", "Sunday")

# Course codes are NOT one shape across the college. Year 3 CSE prints
# ACOL331 (4+3); Year 1 prints AMTL1001 and ACMP1000 (4+4). A regex pinned
# to one of them is exactly how the Year 1 sheets came back empty, so match
# both and let the review step judge anything odd.
COURSE_TOK = re.compile(r"\b([A-Z]{4}\d{3,4})\b")

# Room codes are similarly inconsistent: M4-0-019, M2.2.011, M3-1-004.
ROOM_TOK = re.compile(r"\b(M\d[-.]?\d?[-.]\d[-.]\d{3}|M\d[-.]\d[-.]\d{3})\b")

# The ruler cell reads "8:00 -\n8:30". Times are sometimes split across
# lines and sometimes typo'd with a dot ("9.30"), both seen in the sheets.
RULER_TOK = re.compile(r"(\d{1,2})[:.](\d{2})")

# A block that prints its OWN span inside the cell -- "9:00 - 9:50".
# This beats the column ruler and it is not a nicety: the ruler is a grid of
# round hours, but the real blocks end at :50, or run 14:00-15:20. Reading
# the times off the column edges instead of the cell is a known, shipped
# bug on this sheet family -- it put the home page's countdown out by up to
# 20 minutes until the 23 August revision was re-transcribed.
CELL_SPAN = re.compile(r"(\d{1,2})[:.](\d{2})\s*[-\u2013]\s*(\d{1,2})[:.](\d{2})")


def hhmm(h, m):
    return f"{int(h):02d}:{int(m):02d}"


def read_ruler(header):
    """Column index -> (start, end) from the header row.

    Returns None for any column whose header is not a time range, which is
    how the two leading label columns ("Day and Time", "Groups") drop out
    without being hard-coded by position.
    """
    ruler = []
    for cell in header:
        times = RULER_TOK.findall(cell or "")
        if len(times) >= 2:
            ruler.append((hhmm(*times[0]), hhmm(*times[1])))
        else:
            ruler.append(None)
    return ruler


def span_of(cells, i):
    """How many column positions the cell starting at `i` covers.

    pdfplumber represents a horizontal merge as a bbox at the first
    position and None at every position it swallows, so the span is the
    run of Nones that follows. This is the whole reason for using the
    table structure: it is where a block's END time actually lives on the
    sheets that do not print one.
    """
    n = 1
    while i + n < len(cells) and cells[i + n] is None:
        n += 1
    return n


def parse(pdf_path):
    blocks, notes = [], []

    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        tables = page.find_tables()
        if not tables:
            return [], ["no ruled table found on page 1 — unsupported layout"]
        # Pick the week grid by ITS HEADER, not by its size. On the M.Tech
        # sheets the biggest table is the Course/Title/L-T-P-C list, so
        # "largest table" silently analysed the credit table and reported an
        # unsupported layout for a sheet that parses fine.
        grid = table = ruler = None
        for cand in sorted(tables, key=lambda t: -len(t.rows)):
            rows = cand.extract()
            r = read_ruler(rows[0]) if rows else []
            if any(r):
                grid, table, ruler = rows, cand, r
                break

    if table is None:
        # No time-ruler grid on this sheet. That is the OTHER layout, where
        # each block prints its own span and there is no ruler at all, so
        # hand it to the word-coordinate reader that was written for it.
        return parse_by_coordinates(pdf_path)

    time_cols = [i for i, r in enumerate(ruler) if r]
    label_cols = [i for i in range(len(ruler)) if i < min(time_cols)]

    # CONTINUATION ROWS. On the Year 3 / Year 2 sheets a block is drawn as
    # two stacked cells: the top one names the course and room, the one
    # directly beneath it prints the real span ("9:00 - 9:50") and any note.
    # Read alone, the top cell has no room and no true end time, so the end
    # falls back to the column ruler and comes out rounded to the hour --
    # measured against the hand-verified week, that alone accounted for 13
    # of 23 blocks being wrong while every course, day and START time was
    # already right.
    #
    # Absorb downward ONLY when the lower cell carries no course code of its
    # own. That is what keeps this safe on the Year 1 sheets, where the rows
    # below really are other groups' classes -- those name a course, so they
    # are never swallowed.
    for r in range(1, len(grid) - 1):
        for i in time_cols:
            here = (grid[r][i] or "").strip()
            below = (grid[r + 1][i] or "").strip()
            if not here or not below:
                continue
            if not COURSE_TOK.search(here) or COURSE_TOK.search(below):
                continue
            if table.rows[r + 1].cells[i] is None:
                continue
            grid[r][i] = here + " " + below
            grid[r + 1][i] = ""      # consumed; do not emit it as its own block

    day = None
    for r, row in enumerate(grid[1:], start=1):
        cells = table.rows[r].cells

        # The day label is printed once per day and vertically merged over
        # that day's group rows, so it must carry down rather than be
        # re-read: a blank here means "same day", not "no day".
        for i in label_cols:
            text = (row[i] or "").strip()
            if text in DAYS:
                day = text
        group = None
        if len(label_cols) > 1:
            g = (row[label_cols[-1]] or "").strip()
            group = int(g) if g.isdigit() else None

        for i in time_cols:
            if cells[i] is None:
                continue                      # swallowed by a merge
            text = (row[i] or "").strip()
            if not text:
                continue

            n = span_of(cells, i)
            last = i + n - 1
            start = ruler[i][0]
            end = ruler[last][1] if last < len(ruler) and ruler[last] else None
            source = "column ruler"

            own = CELL_SPAN.search(text)
            if own:
                start, end = hhmm(*own.group(1, 2)), hhmm(*own.group(3, 4))
                source = "printed in the cell"

            courses = COURSE_TOK.findall(text)
            rooms = ROOM_TOK.findall(text)

            flags = []
            if not day:
                flags.append("no day — nothing above this row named one")
            if end is None:
                flags.append("span runs past the last ruler column")
            if not courses:
                # Real and common: "May be used for additional classes",
                # "Lecture Hall", free-text notes. Kept rather than dropped,
                # because a slot the sheet reserves is information even when
                # it names no course.
                flags.append("no course code — free text, needs a human")
            if len(courses) > 1:
                flags.append(f"{len(courses)} course codes in one cell")
            if not rooms:
                flags.append("no room code")

            blocks.append({
                "day": day,
                "group": group,
                "start": start,
                "end": end,
                "course": courses[0] if len(courses) == 1 else None,
                "room": rooms[0].replace(".", "-") if len(rooms) == 1 else None,
                "cols": n,
                "time_from": source,
                "raw": " ".join(text.split()),
                "flags": flags,
                "ok": not flags,
            })

    if not blocks:
        notes.append("table found but no populated time cells — check the layout")
    return blocks, notes


def parse_by_coordinates(pdf_path):
    """Fallback for sheets with no column ruler.

    check_timetable.py already has a reader for this layout, written and
    hardened against the Year 3 sheets. Reuse it rather than growing a
    second copy that can drift from it -- but re-shape its output into the
    same record this tool emits, so the review step sees one format.
    """
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import check_timetable as C

    raw, _labels = C.parse_sheet_blocks(pdf_path)
    blocks = []
    for day, start, end, course, room in raw:
        flags = []
        if not day:
            flags.append("no day")
        if not room:
            flags.append("no room code")
        blocks.append({
            "day": day, "group": None, "start": start, "end": end,
            "course": course, "room": (room or "").replace(".", "-") or None,
            "cols": None, "time_from": "printed in the cell",
            "raw": f"{course} {room or ''}".strip(),
            "flags": flags, "ok": not flags,
        })
    return blocks, ["no column ruler — read by word coordinate instead"]


def report(name, blocks, notes):
    clean = sum(1 for b in blocks if b["ok"])
    flagged = len(blocks) - clean
    status = "EMPTY " if not blocks else "      "
    print(f"{status}{name:44s} {len(blocks):3d} blocks  "
          f"{clean:3d} clean  {flagged:3d} need review", file=sys.stderr)
    for n in notes:
        print(f"        ! {n}", file=sys.stderr)


def main():
    argv = sys.argv[1:]
    out = None
    if "-o" in argv:
        i = argv.index("-o")
        out = pathlib.Path(argv[i + 1])
        del argv[i:i + 2]
    args = [a for a in argv if not a.startswith("-")]

    sheets = [pathlib.Path(a) for a in args] or sorted(SHEETS.glob("*.pdf"))

    result, empty = {}, 0
    for pdf in sheets:
        blocks, notes = parse(pdf)
        report(pdf.name, blocks, notes)
        result[pdf.name] = {"blocks": blocks, "notes": notes}
        if not blocks:
            empty += 1

    text = json.dumps(result, indent=2)
    if out:
        out.write_text(text)
        print(f"\nwrote {out}", file=sys.stderr)
    else:
        print(text)

    total = sum(len(v["blocks"]) for v in result.values())
    need = sum(1 for v in result.values() for b in v["blocks"] if not b["ok"])
    print(f"\n{len(sheets)} sheets · {total} blocks · {need} need review · "
          f"{empty} sheets produced NOTHING", file=sys.stderr)
    return 1 if empty else 0


if __name__ == "__main__":
    sys.exit(main())
