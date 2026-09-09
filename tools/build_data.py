#!/usr/bin/env python3
"""Generate js/gen/data.js from the JSON under data/.

Why a generator instead of hand-written .js data files
------------------------------------------------------
The JSON is the source of truth because JSON is what OTHER things can read:
python tooling, another site, and eventually an export from whatever the
academic office runs. A `window.X = {...}` file is readable by exactly one
consumer, a browser.

But the pages are static with no build step and no bundler, so they want a
plain synchronous <script>. So the JSON is compiled into one, and nobody
hand-edits the output.

It also emits the LEGACY globals (COURSES, WEEK, ROOMS, TERM, NO_CLASS) in
exactly the shapes js/timetable.js and js/scripts.js already expect, so the
data layer can land without rewriting the rendering. Those are a compatibility
surface, not the format: new code should read window.DATA.

Usage:  python3 tools/build_data.py        (writes js/gen/data.js)
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
GEN = ROOT / "js" / "gen" / "data.js"


def load(rel):
    return json.loads((ROOT / rel).read_text())


def strip_notes(o):
    """_note fields document the data for humans; they never reach the browser."""
    if isinstance(o, dict):
        return {k: strip_notes(v) for k, v in o.items() if not k.startswith("_")}
    if isinstance(o, list):
        return [strip_notes(x) for x in o]
    return o


def sync_campus_tools(tt, courses):
    """Rewrite the y3cse rows inside data/campus-tools-data.js from the JSON.

    That file carries all eleven cohorts and was produced by a generator that
    no longer exists, so it cannot be rebuilt wholesale. But one cohort in it
    is OURS, and it had drifted two revisions behind the sheet: ACOL351's
    tutorial still at Wednesday 10:00, AHUL261's G1 tutorial still at
    Wednesday 15:30, ACOL351's Friday lecture still at 09:00. Campus Tools
    reads this file, so it was answering "who is in this room" with a
    timetable nobody has used since 7 September.

    The other ten cohorts are left exactly as they are: nothing here knows
    anything about them, and rewriting data you cannot verify is worse than
    leaving it stale and saying so.
    """
    path = ROOT / "data" / "campus-tools-data.js"
    src = path.read_text()
    day_name = tt["days"]
    kind_word = {"lecture": "lecture", "tut": "tutorial", "lab": "lab", "proj": "res"}

    rows = []
    for d, blocks in tt["week"].items():
        for b in blocks:
            rows.append({
                "day": day_name[d], "start": b["start"], "end": b["end"],
                "course": b["course"], "room": b["room"], "cohort": "y3cse",
                "group": "all" if b["group"] == 0 else f"G{b['group']}",
                "kind": kind_word[b["kind"]],
            })

    keep = [l for l in src.splitlines(keepends=True) if '"cohort": "y3cse"' not in l]
    marker = '  classes: ['
    out, inserted = [], False
    for line in keep:
        out.append(line)
        if not inserted and line.startswith(marker):
            for r in rows:
                out.append("  " + json.dumps(r, ensure_ascii=False) + ",\n")
            inserted = True
    if not inserted:
        raise SystemExit("campus-tools-data.js: could not find the classes array")
    path.write_text("".join(out))
    print(f"data/campus-tools-data.js  <-  {len(rows)} y3cse rows resynced "
          f"(other cohorts untouched)")


def main():
    courses = load("data/linkcs/courses.json")["courses"]
    tt = load("data/linkcs/timetable.json")
    rooms = load("data/institute/rooms.json")["rooms"]
    cal = load("data/institute/calendar.json")

    # ---- legacy COURSES: {CODE: {name, prof}} ----
    legacy_courses = {c: {"name": v["name"], "prof": v.get("prof", "")}
                      for c, v in courses.items()}

    # ---- legacy COURSE_META: card headline, strapline, dept, credits ----
    legacy_meta = {}
    for c, v in courses.items():
        l, t, p_, c_ = v["ltpc"].split("-")
        legacy_meta[c] = {"title": v["title"], "subtitle": v["subtitle"],
                          "dept": v["dept"], "credits": int(c_),
                          "ltp": f"{l}-{t}-{p_}"}

    # ---- legacy WEEK: {dow: [[start, end, code, room, kind, group]]} ----
    # "lecture" is spelled "" in the legacy shape (KIND maps "" -> "Lecture").
    legacy_week = {
        d: [[b["start"], b["end"], b["course"], b["room"],
             "" if b["kind"] == "lecture" else b["kind"], b["group"]]
            for b in blocks]
        for d, blocks in tt["week"].items()
    }

    # ---- legacy ROOMS: {code: {bldg, floor, no, ok, lab}} ----
    # `no` is the number off the plate: "Classroom 7" -> "7".
    legacy_rooms = {}
    for code, r in rooms.items():
        m = re.search(r"(\d+)\s*$", r["plate"])
        entry = {"bldg": r["building"], "floor": r["floor"],
                 "no": m.group(1) if m else r["plate"], "ok": bool(r.get("confirmed"))}
        if r.get("lab"):
            entry["lab"] = True
        for key in [code] + list(r.get("aliases", [])):
            legacy_rooms[key] = entry

    payload = {
        "courses": strip_notes(courses),
        "timetable": strip_notes(tt),
        "rooms": strip_notes(rooms),
        "calendar": strip_notes(cal),
    }

    body = f"""// GENERATED by tools/build_data.py from data/. DO NOT EDIT.
// Edit the JSON under data/ and re-run:  python3 tools/build_data.py
//
// window.DATA is the shape to write new code against. The bare globals
// below it are a compatibility surface for js/timetable.js and
// js/scripts.js, which predate this file.

window.DATA = {json.dumps(payload, indent=2, ensure_ascii=False)};

// A course's printed label is COMPUTED, never stored, so renaming one is a
// one-word edit in courses.json.
window.courseLabel = (code) => {{
  const c = window.DATA.courses[code];
  return c ? `${{code}} (${{c.short}})` : code;
}};

const COURSES = {json.dumps(legacy_courses, indent=2, ensure_ascii=False)};
const COURSE_META = {json.dumps(legacy_meta, indent=2, ensure_ascii=False)};
const WEEK = {json.dumps(legacy_week, indent=2)};
const ROOMS = {json.dumps(legacy_rooms, indent=2)};
const TERM = {json.dumps({"start": cal["term"]["start"], "end": cal["term"]["end"]})};
const NO_CLASS = {json.dumps(cal["noClass"], indent=2, ensure_ascii=False)};
"""
    sync_campus_tools(tt, courses)

    GEN.parent.mkdir(parents=True, exist_ok=True)
    GEN.write_text(body)
    n = sum(len(v) for v in legacy_week.values())
    print(f"js/gen/data.js  <-  {len(courses)} courses, {n} blocks, "
          f"{len(rooms)} rooms, {len(cal['noClass'])} no-class days")


if __name__ == "__main__":
    main()
