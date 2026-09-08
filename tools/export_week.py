#!/usr/bin/env python3
"""Emit a WEEK literal per sheet, in the shape js/timetable.js already uses.

Runs off data/timetables/parsed.json, so it reflects whatever the parser
currently produces. Every file carries its own confidence header: the
L-T-P-C reconciliation for that sheet, and the list of blocks that could
not be exported. A sheet that does not reconcile is not withheld -- it is
handed over WITH the reason, because "here is the data, and here is what
is wrong with it" is useful and a silent partial file is not.

Usage:  python3 tools/export_week.py [outdir]     (default data/timetables/week/)
"""
import json
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from score_parse import score_course           # noqa: E402  same rules, one copy

DAY_NO = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5}


def week_for(name, v):
    blocks = v["blocks"]
    good = [b for b in blocks
            if b.get("day") and b.get("start") and b.get("end") and b.get("course")]
    bad = [b for b in blocks if b not in good and b.get("course")]
    dropped = [b for b in blocks if not b.get("course")]

    courses = v.get("courses") or {}
    lines = [f"// {name}", f"// {len(good)} blocks exported by tools/parse_timetable.py"]

    scorable = {c: x for c, x in courses.items() if x.get("ltpc")}
    if scorable:
        okc, badc, absent = [], [], []
        for code, c in scorable.items():
            mine = [b for b in good if b["course"] == code]
            if not mine:
                absent.append(code)
                continue
            gap, g = score_course(mine, c["ltpc"])
            if any(gap.values()):
                d = " ".join(f"{'+' if gap[k] > 0 else ''}{gap[k]}{k}"
                             for k in "LTP" if gap[k])
                badc.append(f"{code} ({d}, g{g})")
            else:
                okc.append(code)
        lines.append(f"// L-T-P-C check: {len(okc)}/{len(okc) + len(badc)} courses reconcile")
        if badc:
            lines.append("// DOES NOT RECONCILE -- check these before trusting them:")
            for b in badc:
                lines.append(f"//   {b}")
        if absent:
            lines.append(f"// declared in the course table but not on the grid: "
                         f"{', '.join(absent)}")
    else:
        lines.append("// NO L-T-P-C table on this sheet — nothing checked this parse. "
                     "Treat every block as unverified.")

    by_day = {}
    for b in good:
        by_day.setdefault(b["day"], []).append(b)

    lines.append("const WEEK = {")
    for day, n in sorted(DAY_NO.items(), key=lambda kv: kv[1]):
        rows = sorted(by_day.get(day, []), key=lambda b: b["start"])
        if not rows:
            continue
        lines.append(f"    {n}: [ // {day}")
        for b in rows:
            lines.append(
                f'        ["{b["start"]}", "{b["end"]}", "{b["course"]}", '
                f'"{b.get("room") or ""}", "{b.get("kind") or ""}", {b.get("group") or 0}],')
        lines.append("    ],")
    lines.append("};")

    if bad:
        lines.append(f"\n// {len(bad)} block(s) NOT exported — missing a day, time or room:")
        for b in bad:
            lines.append(f'//   {b.get("day") or "?"} {b.get("start") or "?"}-'
                         f'{b.get("end") or "?"} {b["course"]}   sheet: {b.get("raw", "")[:70]}')
    if dropped:
        lines.append(f"\n// {len(dropped)} cell(s) with no course code (reserved slots, "
                     "lunch, free text) — not classes:")
        for b in dropped[:12]:
            lines.append(f'//   {b.get("day") or "?"} {b.get("start") or "?"}  '
                         f'{b.get("raw", "")[:64]}')
        if len(dropped) > 12:
            lines.append(f"//   ... and {len(dropped) - 12} more")
    return "\n".join(lines) + "\n"


def main():
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 \
        else ROOT / "data" / "timetables" / "week"
    out.mkdir(parents=True, exist_ok=True)
    data = json.loads((ROOT / "data" / "timetables" / "parsed.json").read_text())
    for name in sorted(data):
        f = out / (pathlib.Path(name).stem + ".week.js")
        f.write_text(week_for(name, data[name]))
        print(f"{f.relative_to(ROOT)}")
    print(f"\n{len(data)} files written to {out.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
