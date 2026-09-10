#!/usr/bin/env python3
"""Read a timetable sheet EXACTLY, by opening the spreadsheet inside the PDF.

Why this is not the parser that was deleted
-------------------------------------------
The old one reconstructed a grid from geometry: ruled lines, word coordinates,
column rulers. It reached 71 of 87 courses and every remaining error needed a
human to spot it, because a wrong-but-plausible block looks exactly like a
right one.

These sheets are Acrobat-PDFMaker-for-Excel exports, and every sheet from
2026-09-07 onward is a TAGGED pdf. The spreadsheet is still in the file:

  * /StructTreeRoot -> /Table -> /TR -> /TD, and each cell DECLARES its own
    /ColSpan and /RowSpan. Merges are stated, not inferred from pixel widths.
  * each /TD points at marked-content ids, and pdfplumber hands back every
    character with its `mcid`, so cell -> text is a join, not a guess.
  * the cell text is already the record:
        ACOL351 / M4-0-019 / M4-Classroom 3 / 15:30 - 16:20 / Tutorial

So there is no reading step to be wrong about. Either the file is tagged and
the answer is exact, or it is not tagged and this refuses.

What is NOT exact, and how it is decided anyway
-----------------------------------------------
The sheet prints a Group 1 row and a Group 2 row per day. Anything in the G2
row is group 2. But a block in the G1 row is either group-1-only or for
everyone, and NOTHING in the file distinguishes them: on Monday, AHUL261's
9:00 tutorial (group 1) and ACOL331's 10:00 lecture (everyone) sit in the same
row with identical col=1 row=1 spans.

That is settled by the credit table, which is the other half of the document
and is not transcribed from the grid:

  * AHUL256 has TWO tutorial cells. If both meant everyone it would have 2
    tutorial hours against a 3-1-0-4 that permits 1. So they are per-group.
  * ACOL351 has ONE tutorial cell. If it meant group 1 only, group 2 would
    have 0 tutorial hours against 3-1-0-4. So it is for everyone.

Neither was guessed. Both were forced. So the tool PROPOSES assignments,
the credit table DISPOSES, and if none reconciles -- or more than one does --
it refuses and names the cell instead of picking.

Usage:
    python3 tools/parse_sheet.py <sheet.pdf>          human-readable report
    python3 tools/parse_sheet.py <sheet.pdf> --json   the blocks, as JSON
    python3 tools/parse_sheet.py --all                every sheet, one line each

Exit code is 0 only when the sheet parsed AND reconciled.
"""
import collections
import itertools
import json
import pathlib
import re
import sys

try:
    import pikepdf
    import pdfplumber
except ImportError:
    sys.exit("needs pikepdf and pdfplumber:  pip install pikepdf pdfplumber")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEETS = ROOT / "data" / "timetables"

MIN_PER_HOUR = 50          # a ":50" slot is one nominal contact hour
PARTIALLY_SCHEDULED = {"ACOD310"}   # 0-0-6-3 but only one slot is reserved
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# COURSE \n ROOMCODE \n ... somewhere a printed time span
BLOCK_HEAD = re.compile(r"^(?:Reserved for\s+)?([A-Z]{3,4}\d{3,4})\n\s*([\w.\-]+)\n")
TIMESPAN = re.compile(r"(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})")


# ---------- layer 1: the file's own table ----------

def mcid_text(path):
    """(page, mcid) -> the exact characters inside that marked content."""
    out = {}
    with pdfplumber.open(path) as pdf:
        for pageno, page in enumerate(pdf.pages):
            by = collections.defaultdict(list)
            for ch in page.chars:
                if ch.get("mcid") is not None:
                    by[(pageno, ch["mcid"])].append(ch)
            for key, chars in by.items():
                chars.sort(key=lambda c: (round(c["top"], 1), c["x0"]))
                buf, prev = [], None
                for c in chars:
                    if prev and round(c["top"], 1) != round(prev["top"], 1):
                        buf.append("\n")
                    elif prev and c["x0"] - prev["x1"] > 1.2:
                        buf.append(" ")
                    buf.append(c["text"])
                    prev = c
                out[key] = "".join(buf).strip()
    return out


def _descend(node, want):
    """Every descendant tagged `want`, not entering one inside another."""
    found = []

    def walk(x):
        if isinstance(x, pikepdf.Dictionary):
            if str(x.get("/S", "")) == want:
                found.append(x)
                return
            if "/K" in x:
                walk(x["/K"])
        elif isinstance(x, pikepdf.Array):
            for y in x:
                walk(y)

    walk(node)
    return found


def _mcids(cell):
    got = []

    def walk(x):
        if isinstance(x, int):
            got.append(int(x))
        elif isinstance(x, pikepdf.Dictionary):
            if "/MCID" in x:
                got.append(int(x["/MCID"]))
            elif "/K" in x:
                walk(x["/K"])
        elif isinstance(x, pikepdf.Array):
            for y in x:
                walk(y)

    walk(cell.get("/K"))
    return got


def _span(cell, name):
    attrs = cell.get("/A")
    if attrs is None:
        return 1
    for d in (attrs if isinstance(attrs, pikepdf.Array) else [attrs]):
        if isinstance(d, pikepdf.Dictionary) and name in d:
            return int(d[name])
    return 1


def read_cells(path):
    """[(row_index, colspan, rowspan, text)] for the biggest table in the file.

    Raises if the PDF carries no structure tree, which is the whole point: an
    untagged sheet has no exact reading, and guessing one is the failure this
    tool exists to remove.
    """
    text_of = mcid_text(path)
    with pikepdf.open(path) as pdf:
        if "/StructTreeRoot" not in pdf.Root:
            raise LookupError("not a tagged PDF - no /StructTreeRoot")
        tables = []

        def find(o):
            if isinstance(o, pikepdf.Dictionary):
                if str(o.get("/S", "")) == "/Table":
                    tables.append(o)
                if "/K" in o:
                    find(o["/K"])
            elif isinstance(o, pikepdf.Array):
                for x in o:
                    find(x)

        find(pdf.Root["/StructTreeRoot"]["/K"])
        if not tables:
            raise LookupError("tagged, but there is no /Table in the structure")

        grid = max(tables, key=lambda t: len(_descend(t["/K"], "/TR")))
        pageno = {pg.obj.objgen: i for i, pg in enumerate(pdf.pages)}

        cells = []
        for ri, row in enumerate(_descend(grid["/K"], "/TR")):
            if "/K" not in row:
                continue
            for c in _descend(row["/K"], "/TD") + _descend(row["/K"], "/TH"):
                pg = c.get("/Pg")
                pi = pageno.get(pg.objgen, 0) if pg is not None else 0
                txt = "\n".join(t for t in (text_of.get((pi, m), "") for m in _mcids(c)) if t)
                cells.append((ri, _span(c, "/ColSpan"), _span(c, "/RowSpan"), txt))
        return cells


# ---------- layer 2: cells -> blocks ----------

def hhmm(t):
    h, m = re.split(r"[:.]", t)
    return f"{int(h):02d}:{m}"


def minutes(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def kind_of(flat):
    low = flat.lower()
    if "tutorial" in low:
        return "tut"
    if "lab" in low or "Computer Lab" in flat:
        return "lab"
    if "reserved for" in low:
        return "proj"
    return "lecture"


def read_blocks(path):
    """Every teaching block on the sheet, with the row it was printed in.

    `grouprow` is 1 or 2: which of the sheet's two per-day rows held the cell.
    That is a FACT off the page. The `group` a block ends up with is not, and
    is decided later against the credit table.
    """
    cells = read_cells(path)
    rows = collections.defaultdict(list)
    for ri, cs, rs, txt in cells:
        rows[ri].append((cs, rs, txt))

    blocks, day, grouprow = [], None, 1
    for ri in sorted(rows):
        flats = [re.sub(r"\s+", " ", t).strip() for _cs, _rs, t in rows[ri]]
        for f in flats:
            if f in DAYS:
                day = f
        # the sheet marks its two per-day rows with a bare "1" and "2"
        marks = {f for f in flats if f in ("1", "2")}
        if marks:
            grouprow = 2 if marks == {"2"} else 1

        for _cs, _rs, txt in rows[ri]:
            head = BLOCK_HEAD.match(txt)
            if not head or day is None:
                continue
            flat = re.sub(r"\s+", " ", txt).strip()
            span = TIMESPAN.search(flat)
            if not span:
                continue
            blocks.append({
                "day": day,
                "start": hhmm(span.group(1)),
                "end": hhmm(span.group(2)),
                "course": head.group(1),
                "room": head.group(2),
                "kind": kind_of(flat),
                "grouprow": grouprow,
                "text": flat,
            })
    return blocks


# ---------- layer 3: the credit table decides the groups ----------

def read_credits(path):
    with pdfplumber.open(path) as pdf:
        text = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
    out = {}
    for code, l, t, p, _c in re.findall(r"\b([A-Z]{3,4}\d{3,4})\b[^\n]*?(\d+)-(\d+)-(\d+)-(\d+)", text):
        out[code] = (int(l), int(t), int(p))
    return out


def nominal(mins):
    return round(mins / MIN_PER_HOUR)


def reconciles(blocks, credits):
    """Does every course add up in BOTH groups? Returns a list of failures."""
    bad = []
    for group in (1, 2):
        got = {}
        for b in blocks:
            if b["group"] not in (0, group):
                continue
            bucket = {"tut": "T", "lab": "P", "proj": "P"}.get(b["kind"], "L")
            got.setdefault(b["course"], {"L": 0, "T": 0, "P": 0})[bucket] += \
                minutes(b["end"]) - minutes(b["start"])
        for course, (wl, wt, wp) in credits.items():
            if course not in got:
                bad.append(f"G{group} {course}: in the credit table, never on the grid")
                continue
            for bucket, want in (("L", wl), ("T", wt), ("P", wp)):
                have = nominal(got[course][bucket])
                if have == want or (course in PARTIALLY_SCHEDULED and have < want):
                    continue
                bad.append(f"G{group} {course} {bucket}: sheet says {want}h, grid has {have}h")
    return bad


def assign_groups(blocks, credits):
    """Propose, verify, refuse.

    A block printed in the G2 row is group 2: that is on the page. A block in
    the G1 row is either group 0 or group 1, and only the credit table knows
    which, so every combination is tried and the ones that reconcile are
    returned. One means certainty. Zero or several means we do not know, and
    saying so is the entire point.
    """
    for b in blocks:
        b["group"] = 2 if b["grouprow"] == 2 else 0

    # Only blocks in the G1 row are in question, and in practice only the
    # tutorials: a lecture or a lab printed once is for the whole cohort.
    # If tutorials alone cannot be made to reconcile, widen to every G1 block
    # rather than declare failure on a guess about which ones matter.
    for candidates in (
        [b for b in blocks if b["grouprow"] == 1 and b["kind"] == "tut"],
        [b for b in blocks if b["grouprow"] == 1],
    ):
        if len(candidates) > 14:          # 2^14, past which this is not a search
            break
        solutions = []
        for combo in itertools.product((0, 1), repeat=len(candidates)):
            for b, g in zip(candidates, combo):
                b["group"] = g
            if not reconciles(blocks, credits):
                solutions.append(combo)
        if len(solutions) == 1:
            for b, g in zip(candidates, solutions[0]):
                b["group"] = g
            return blocks, []
        if len(solutions) > 1:
            for b in candidates:
                b["group"] = 0
            return blocks, [
                f"AMBIGUOUS: {len(solutions)} different group assignments all reconcile. "
                f"The sheet does not determine it. Cells in question: " +
                ", ".join(f"{b['course']} {b['day']} {b['start']}" for b in candidates)
            ]
        for b in candidates:              # reset before widening
            b["group"] = 2 if b["grouprow"] == 2 else 0

    return blocks, reconciles(blocks, credits) or ["no group assignment reconciles"]


# ---------- reporting ----------

def parse(path):
    blocks = read_blocks(path)
    credits = read_credits(path)
    if not credits:
        return blocks, ["no L-T-P-C table found on this sheet, so nothing can verify the groups"]
    return assign_groups(blocks, credits)


def report(path):
    print(f"sheet   {path.name}")
    try:
        blocks, problems = parse(path)
    except LookupError as e:
        print(f"REFUSED  {e}")
        print("         An untagged sheet has no exact reading. This tool does not guess.")
        return 2

    by_day = collections.defaultdict(list)
    for b in blocks:
        by_day[b["day"]].append(b)

    print(f"blocks  {len(blocks)}\n")
    for day in DAYS:
        if day not in by_day:
            continue
        print(f"  {day}")
        for b in sorted(by_day[day], key=lambda x: (x["start"], x["group"])):
            g = {0: "all", 1: "G1", 2: "G2"}[b["group"]]
            kind = "" if b["kind"] == "lecture" else b["kind"]
            print(f"    {b['start']}-{b['end']}  {b['course']:<9} {b['room']:<10} "
                  f"{g:<4} {kind}")
        print()

    if problems:
        print("NOT WRITTEN. The grid and the credit table disagree:")
        for p in problems:
            print("   ", p)
        return 1
    print("OK - every course reconciles in both groups against the sheet's own credit table.")
    return 0


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}

    if "--all" in flags:
        worst = 0
        for f in sorted(SHEETS.glob("*.pdf")):
            try:
                blocks, problems = parse(f)
                state = "ok" if not problems else f"{len(problems)} mismatch"
                print(f"  {f.name:<44} {len(blocks):>3} blocks   {state}")
                worst = max(worst, 0 if not problems else 1)
            except LookupError as e:
                print(f"  {f.name:<44}   -  refused   {e}")
                worst = max(worst, 2)
        return worst

    if not args:
        return report(sorted(SHEETS.glob("*year3-sem5-btech-cse.pdf"))[-1])

    path = pathlib.Path(args[0])
    if "--json" in flags:
        blocks, problems = parse(path)
        print(json.dumps({"blocks": blocks, "problems": problems}, indent=2))
        return 1 if problems else 0
    return report(path)


if __name__ == "__main__":
    sys.exit(main())
