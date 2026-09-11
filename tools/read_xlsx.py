#!/usr/bin/env python3
"""Read the schedule workbooks the office actually works in.

Priya sent these on 2026-09-11, and they retire every hard problem the PDF
route had:

  * GROUP is stated, not deduced. Each day occupies four spreadsheet rows, two
    per group. A block merged across all four is for everyone; one merged
    across only the first two is group 1; the last two, group 2. The PDF lost
    that distinction entirely, which is why it took a credit-table search to
    recover it, and why two courses stayed ambiguous even then.
  * every cohort is here, including the four Year 1 sheets whose PDFs are
    untagged and have no exact reading at all.
  * they are AHEAD of the website: Year 2 is dated 10 September, and the
    newest Year 2 PDF published is the 8th.

So this replaces tools/parse_sheet.py for every sheet it can see. The PDF
reader stays for the case where only a PDF exists.

    python3 tools/read_xlsx.py                 every workbook, summary
    python3 tools/read_xlsx.py --json          all blocks as JSON
    python3 tools/read_xlsx.py --cohort CSE5   one cohort, readable
"""
import json
import pathlib
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("needs openpyxl:  pip install openpyxl")

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOKS = ROOT / "data" / "schedules"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# COURSE / ROOMCODE / [ROOM NAME] / TIME / [notes], as separate lines in a cell
CODE = re.compile(r"^\s*(?:Reserved for\s+)?([A-Z]{3,4}\d{3,4})\s*$")
ROOM = re.compile(r"^\s*([A-Z]\d[.\-]\d[.\-]\d{3})\s*$")
# Year 3 writes "15:30 - 16:20"; Year 1 writes "08:00 to 09:20".
SPAN = re.compile(r"(\d{1,2}[:.]\d{2})\s*(?:-|to)\s*(\d{1,2}[:.]\d{2})")


def hhmm(t):
    h, m = re.split(r"[:.]", t)
    return f"{int(h):02d}:{m}"


def kind_of(text):
    low = text.lower()
    if "help session" in low:
        return "help"
    if "tutorial" in low:
        return "tut"
    if "lab" in low:
        return "lab"
    if "reserved for" in low:
        return "proj"
    return "lecture"


def read_sheet(ws):
    """Every block on one worksheet, with the group taken from the merge span."""
    merged = {(r.min_row, r.min_col): r for r in ws.merged_cells.ranges}

    # a day starts wherever column A names it, and owns the rows up to the next
    day_at = {}
    for row in ws.iter_rows(min_col=1, max_col=1):
        v = row[0].value
        if isinstance(v, str) and v.strip() in DAYS:
            day_at[row[0].row] = v.strip()
    if not day_at:
        return []
    starts = sorted(day_at)
    ends = {s: (starts[i + 1] - 1 if i + 1 < len(starts) else s + (starts[1] - starts[0] - 1))
            for i, s in enumerate(starts)}

    blocks = []
    for top, day in day_at.items():
        bottom = ends[top]

        # Which spreadsheet row belongs to which group is PRINTED in column B.
        # Year 3 gives each group two rows, Year 1 gives each of its four groups
        # one row, and reading the labels handles both without knowing either.
        row_group = {}
        for r in range(top, bottom + 1):
            v = ws.cell(row=r, column=2).value
            if isinstance(v, (int, float)):
                row_group[r] = int(v)
            elif isinstance(v, str) and v.strip().isdigit():
                row_group[r] = int(v.strip())
        all_groups = set(row_group.values())
        # a row with no label of its own continues the row above it
        last = None
        for r in range(top, bottom + 1):
            if r in row_group:
                last = row_group[r]
            elif last is not None:
                row_group[r] = last

        for row in ws.iter_rows(min_row=top, max_row=bottom, min_col=3):
            for cell in row:
                text = cell.value
                if not isinstance(text, str):
                    continue
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                if not lines:
                    continue
                m = CODE.match(lines[0])
                span = SPAN.search(" ".join(lines))
                if not m or not span:
                    continue

                rng = merged.get((cell.row, cell.column))
                r0 = rng.min_row if rng else cell.row
                r1 = rng.max_row if rng else cell.row
                # THE POINT: the rows a block is merged across ARE its groups.
                covered = {row_group[r] for r in range(r0, r1 + 1) if r in row_group}
                groups = sorted(covered)
                group = 0 if (not covered or covered == all_groups) else (
                    groups[0] if len(groups) == 1 else 0)

                room = next((l for l in lines[1:] if ROOM.match(l)), "")
                # the friendly name the sheet prints next to the code, kept so a
                # cross-sheet check can catch a code and a name disagreeing
                named = next((l for l in lines[1:]
                              if re.search(r"(Classroom|Lecture Hall|Computer Lab|Lab)", l)
                              and not ROOM.match(l)), "")
                blocks.append({
                    "day": day,
                    "start": hhmm(span.group(1)),
                    "end": hhmm(span.group(2)),
                    "course": m.group(1),
                    "room": room.replace(".", "-"),
                    "kind": kind_of(text),
                    "group": group,
                    "groups": groups if covered != all_groups else [],
                    "room_name": named.lstrip("M0123456789-, ").strip() or named.strip(),
                    "text": " / ".join(lines),
                })
    return blocks


def read_book(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    return {ws.title: read_sheet(ws) for ws in wb.worksheets}


def all_cohorts():
    out = {}
    # skip our own output and the lock files Excel leaves while a file is open
    for f in sorted(BOOKS.glob("*.xlsx")):
        if f.name.startswith("~$") or f.name == "room-wise-schedule.xlsx":
            continue
        for name, blocks in read_book(f).items():
            if blocks:
                out[name] = {"source": f.name, "blocks": blocks}
    return out


def main():
    data = all_cohorts()
    if "--json" in sys.argv:
        print(json.dumps(data, indent=2))
        return 0

    pick = None
    if "--cohort" in sys.argv:
        pick = sys.argv[sys.argv.index("--cohort") + 1]

    for name, d in data.items():
        if pick and pick.upper() not in name.upper():
            continue
        bs = d["blocks"]
        tally = {}
        for b in bs:
            key = "all" if b["group"] == 0 else f"G{b['group']}"
            tally[key] = tally.get(key, 0) + 1
        spread = " ".join(f"{k}={v}" for k, v in sorted(tally.items()))
        print(f"{name:<20} {len(bs):>3} blocks   {spread:<28} <- {d['source']}")
        if pick:
            for day in DAYS:
                for b in sorted((x for x in bs if x["day"] == day), key=lambda x: x["start"]):
                    g = {0: "all", 1: "G1", 2: "G2"}[b["group"]]
                    k = "" if b["kind"] == "lecture" else b["kind"]
                    print(f"    {day[:3]} {b['start']}-{b['end']}  {b['course']:<9} "
                          f"{b['room']:<10} {g:<4} {k}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
