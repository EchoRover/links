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
IMGS = SHEETS / "img"

# 72pt = 1in, so this is the pt -> px factor the editor multiplies every
# bbox by to lay its overlay on the rendered page. It MUST match what the
# PNG was rendered at or the boxes drift, so it is written into the JSON
# rather than agreed by convention in two files.
DPI = 140
SCALE = DPI / 72

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


# The sheet's OTHER half. The week grid is what gets transcribed; the
# course table is not, which is exactly what makes it usable as a check on
# the grid rather than a second reading of it. L-T-P-C says, per course and
# independently of the drawing, how many lecture / tutorial / practical
# hours must exist. That is what says whether a course HAS a lab at all.
LTPC = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*$")


# The sheets label a block's KIND in words inside the cell -- "Tutorial",
# "Lab 1st 2hrs", "Reserved for ACOD310". Read it rather than inferring it
# from duration, which is how an unlabelled 110-minute lab reads as a
# lecture, confidently, every time.
#
# The room NAME is stripped first: "M3-Computer Lab 03" contains the word
# Lab and is not evidence of anything. That false positive would mark every
# class held in a computer lab as a practical.
ROOM_LABEL = re.compile(r"M\d-(?:Computer\s+Lab|Classroom|Energy\s+Lab)\s*\d*", re.I)


def infer_kind(text):
    body = ROOM_LABEL.sub(" ", text)
    if re.search(r"\btut(orial)?\b", body, re.I):
        return "tut", "the cell says so"
    if re.search(r"\blab\b|\bpractical\b", body, re.I):
        return "lab", "the cell says so"
    if re.search(r"\breserved for\b|\bproject\b", body, re.I):
        return "proj", "the cell says so"
    return "", "assumed lecture"


def parse_courses(page):
    """{code: {title, ltpc, faculty}} from the sheet's own course table.

    Returns {} when the sheet does not carry one -- the Year 1 sheets do
    not. Missing is reported, never faked: a course list invented from the
    grid would agree with the grid by construction and check nothing.
    """
    for table in page.find_tables():
        rows = table.extract()
        if not rows or not any("L-T-P-C" in (c or "") for c in rows[0]):
            continue
        head = [(c or "").strip().lower() for c in rows[0]]
        col = {name: head.index(name) for name in
               ("course", "title", "l-t-p-c", "faculty") if name in head}
        out = {}
        for row in rows[1:]:
            code = (row[col["course"]] or "").strip() if "course" in col else ""
            if not COURSE_TOK.fullmatch(code):
                continue
            m = LTPC.match((row[col["l-t-p-c"]] or "")) if "l-t-p-c" in col else None
            out[code] = {
                "title": " ".join((row[col["title"]] or "").split()) if "title" in col else "",
                "faculty": " ".join((row[col["faculty"]] or "").split()) if "faculty" in col else "",
                "ltpc": [int(x) for x in m.groups()] if m else None,
            }
        if out:
            return out
    return {}


def hexcolor(c):
    """pdfplumber gives fills as 0-1 floats: a scalar for grey, a 3-tuple
    for RGB, a 4-tuple for CMYK. The sheet colour-codes each course, so
    this is what lets the overlay use the SHEET's own colours instead of a
    palette I invent -- the box is then obviously the same block as the
    cell under it."""
    if c is None:
        return None
    if isinstance(c, (int, float)):
        c = (c, c, c)
    c = tuple(c)
    if len(c) == 4:
        k = c[3]
        c = tuple((1 - x) * (1 - k) for x in c[:3])
    if len(c) == 1:
        c = c * 3
    if len(c) != 3:
        return None
    return "#" + "".join(f"{max(0, min(255, round(x * 255))):02x}" for x in c)


def fill_at(rects, bbox):
    """Fill colour of the smallest filled rect covering this cell's centre."""
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    best = None
    for r in rects:
        if r["x0"] <= cx <= r["x1"] and r["top"] <= cy <= r["bottom"]:
            area = (r["x1"] - r["x0"]) * (r["bottom"] - r["top"])
            if best is None or area < best[0]:
                best = (area, r)
    return hexcolor(best[1].get("non_stroking_color")) if best else None


def render_page(pdf_path, page):
    """Write the page as a PNG the editor draws its overlay on top of.

    The whole point of the overlay is that a wrong block is VISIBLE: a box
    that does not sit on the cell it claims to describe is obviously wrong,
    where the same error in a table of times is invisible.
    """
    IMGS.mkdir(exist_ok=True)
    out = IMGS / (pdf_path.stem + ".png")
    page.to_image(resolution=DPI).save(str(out))
    return f"data/timetables/img/{out.name}"


def parse(pdf_path):
    blocks, notes = [], []

    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        courses = parse_courses(page)
        img = render_page(pdf_path, page)
        page_meta = {"img": img, "w": float(page.width), "h": float(page.height),
                     "scale": SCALE}
        fills = [r for r in page.rects if r.get("non_stroking_color") is not None]
        tables = page.find_tables()
        if not tables:
            return [], ["no ruled table found on page 1 — unsupported layout"], courses, page_meta
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
        blocks, notes = parse_by_coordinates(pdf_path)
        return blocks, notes, courses, page_meta

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

            box = cells[i]
            n = span_of(cells, i)
            last = i + n - 1
            start = ruler[i][0]
            end = ruler[last][1] if last < len(ruler) and ruler[last] else None
            source = "column ruler"

            own = CELL_SPAN.search(text)
            if own:
                start, end = hhmm(*own.group(1, 2)), hhmm(*own.group(3, 4))
                source = "printed in the cell"

            kind, kind_from = infer_kind(text)
            codes = COURSE_TOK.findall(text)
            rooms = ROOM_TOK.findall(text)

            flags = []
            if not day:
                flags.append("no day — nothing above this row named one")
            if end is None:
                flags.append("span runs past the last ruler column")
            if not codes:
                # Real and common: "May be used for additional classes",
                # "Lecture Hall", free-text notes. Kept rather than dropped,
                # because a slot the sheet reserves is information even when
                # it names no course.
                flags.append("no course code — free text, needs a human")
            if len(codes) > 1:
                flags.append(f"{len(codes)} course codes in one cell")
            if not rooms:
                flags.append("no room code")

            blocks.append({
                "day": day,
                "group": group,
                "start": start,
                "end": end,
                "course": codes[0] if len(codes) == 1 else None,
                "room": rooms[0].replace(".", "-") if len(rooms) == 1 else None,
                "cols": n,
                "time_from": source,
                # Page coordinates in points, exactly as the cell is drawn.
                # The editor scales these by page.scale to position its box.
                "bbox": [round(v, 2) for v in box] if box else None,
                "fill": fill_at(fills, box) if box else None,
                "kind": kind,
                "kind_from": kind_from,
                "raw": " ".join(text.split()),
                "flags": flags,
                "ok": not flags,
            })

    blocks = absorb_continuations(blocks)
    blocks = assign_labs(blocks, courses)

    if not blocks:
        notes.append("table found but no populated time cells — check the layout")
    if not courses:
        notes.append("no L-T-P-C course table on this sheet — "
                     "nothing to reconcile the grid against")
    return blocks, notes, courses, page_meta


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
            "cols": None, "time_from": "printed in the cell", "bbox": None, "fill": None,
            "kind": "", "kind_from": "assumed lecture",
            "raw": f"{course} {room or ''}".strip(),
            "flags": flags, "ok": not flags,
        })
    return blocks, ["no column ruler — read by word coordinate instead"]


def absorb_continuations(blocks):
    """Fold a cell into the one directly above it when it is that block's
    continuation rather than a block of its own.

    A block is drawn as TWO STACKED CELLS on these sheets: the upper names
    the course and room, the lower prints the real span ("8:00 - 9:50 Lab
    1st 2hrs") and any note. Read apart they are a block with no end time
    and a mystery cell with no course.

    This runs on GEOMETRY, not row indices. An earlier version matched
    grid[r] against grid[r+1] and silently missed every Wednesday block,
    because a day's two group bands are not always adjacent rows in
    pdfplumber's model. Same edges, touching vertically, no course code of
    its own: that is a continuation, wherever it lands in the row list.

    Merging also settles GROUP. A cell pair that covers both group bands is
    one class for everyone, so the merged block is group 0. Emitting the
    upper cell's row number instead is what split whole-cohort lectures
    into a phantom g1 and g2.
    """
    out, eaten = [], set()
    for i, a in enumerate(blocks):
        if i in eaten or not a["bbox"] or not a["course"]:
            continue
        for j, b in enumerate(blocks):
            if j == i or j in eaten or b["course"] or not b["bbox"]:
                continue
            same_cols = (abs(b["bbox"][0] - a["bbox"][0]) < 2
                         and abs(b["bbox"][2] - a["bbox"][2]) < 2)
            touching = abs(b["bbox"][1] - a["bbox"][3]) < 3
            if not (same_cols and touching):
                continue
            eaten.add(j)
            a["raw"] = (a["raw"] + " " + b["raw"]).strip()
            a["bbox"] = [a["bbox"][0], a["bbox"][1], a["bbox"][2], b["bbox"][3]]
            # It covers both group bands, so it is not group-specific.
            a["group"] = 0
            own = CELL_SPAN.search(a["raw"])
            if own:
                a["start"] = hhmm(*own.group(1, 2))
                a["end"] = hhmm(*own.group(3, 4))
                a["time_from"] = "printed in the cell"
            kind, kind_from = infer_kind(a["raw"])
            if kind:
                a["kind"], a["kind_from"] = kind, kind_from
            rooms = ROOM_TOK.findall(a["raw"])
            if not a["room"] and len(rooms) == 1:
                a["room"] = rooms[0].replace(".", "-")
            break

    for i, b in enumerate(blocks):
        if i in eaten:
            continue
        b["flags"] = [f for f in b["flags"]
                      if not (b["course"] and f.startswith(("no room", "span runs")))
                      or not b["room"]]
        if b["course"]:
            b["flags"] = [f for f in b["flags"] if "no course code" not in f]
            if b["room"]:
                b["flags"] = [f for f in b["flags"] if not f.startswith("no room")]
            if b["time_from"] == "column ruler":
                b["flags"].append("end time is a column edge, the cell printed none")
                b["flags"] = list(dict.fromkeys(b["flags"]))
        # GROUP, defaulted honestly. The sheet draws a whole-cohort class
        # inside the group 1 band, so its row number is not evidence the
        # class is group-specific -- taking it at face value split every
        # lecture into a phantom g1 and g2. What DOES split in practice is
        # tutorials, which is why the sheet has group bands at all. So:
        # everything is group 0 unless it is a tutorial, and the tutorials
        # keep the band they were drawn in. Wrong cases are visible on the
        # map and are one keystroke to fix.
        if b["kind"] != "tut":
            b["group"] = 0
        b["ok"] = not b["flags"]
        out.append(b)
    return out


# "M3-Computer Lab 03", "M3-Energy Lab". NOT "M4-Classroom 7" -- there is
# no standalone "lab" token in "Classroom".
LAB_ROOM = re.compile(r"\blab(oratory)?\b", re.I)


def assign_labs(blocks, courses):
    """A block in a LAB ROOM, for a course whose credits declare practical
    hours, is that practical.

    infer_kind() cannot make this call: it reads the cell in isolation, and
    the only evidence in the cell is the ROOM NAME, which it has to strip
    ("M3-Computer Lab 03" contains the word Lab and would otherwise mark
    every class held in a computer lab as a practical). The credit table is
    what makes the room name meaningful -- if a course must have practical
    hours and one of its blocks is in a lab, that block is the practical.

    This was the single biggest error in the parse. Every 3-0-2-4 course on
    every sheet scored +2L -2P: seven courses across five sheets, all one
    bug, all invisible until the sheets were scored against their own
    credit tables instead of one hand-checked week being taken as typical.

    Only fires when the course has NO lab block yet, so an explicit "Lab
    1st 2hrs" in the cell always wins over this inference.
    """
    for code, c in courses.items():
        ltpc = c.get("ltpc")
        if not ltpc or not ltpc[2]:
            continue
        mine = [b for b in blocks if b["course"] == code]

        # A course with NO lecture and NO tutorial hours is entirely
        # practical -- ASBP1100 is 0-0-2-1, ACOD310 is 0-0-6-3. Every block
        # it has is the practical, whatever room it is in and whether or not
        # the cell bothers to say "Lab". No inference needed, the credits
        # leave nothing else it could be.
        if not ltpc[0] and not ltpc[1]:
            for b in mine:
                if not b.get("kind"):
                    b["kind"] = "lab"
                    b["kind_from"] = "the course is all practical hours"
            continue

        if any(b.get("kind") in ("lab", "proj") for b in mine):
            continue
        for b in mine:
            if LAB_ROOM.search(b.get("raw") or ""):
                b["kind"] = "lab"
                b["kind_from"] = "in a lab room, and the credits declare practical hours"
    return blocks


def report(name, blocks, notes, courses):
    clean = sum(1 for b in blocks if b["ok"])
    flagged = len(blocks) - clean
    status = "EMPTY " if not blocks else "      "
    creds = sum(1 for c in courses.values() if c["ltpc"])
    print(f"{status}{name:44s} {len(blocks):3d} blocks  "
          f"{clean:3d} clean  {flagged:3d} need review  "
          f"{creds:2d} courses w/ L-T-P-C", file=sys.stderr)
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
        blocks, notes, courses, page_meta = parse(pdf)
        report(pdf.name, blocks, notes, courses)
        result[pdf.name] = {"blocks": blocks, "notes": notes,
                            "courses": courses, "page": page_meta}
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
