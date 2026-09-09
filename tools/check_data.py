#!/usr/bin/env python3
"""Referential integrity for data/. Exit code is the number of problems.

This is the thing a database gives you for free and a pile of hand-written
.js files never will: a guarantee that every code one file mentions actually
exists in the file that defines it.

It checks what CANNOT be checked by looking at one file:
  * every course code used by a timetable block exists in courses.json
  * every room code used by a block exists in rooms.json (aliases count)
  * every course in courses.json actually appears in the week
  * no two courses share a printed label
  * blocks are sane: end after start, known kind, known group, known day
  * no-class days fall inside the term
  * the generated js/gen/data.js is not stale

It does NOT check the timetable against the official PDF. That is
tools/check_timetable.py, which reconciles against the sheet's own credit
table, a source this file cannot see.

Usage:  python3 tools/check_data.py
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
problems = []


def bad(msg):
    problems.append(msg)


def load(rel):
    return json.loads((ROOT / rel).read_text())


courses = load("data/linkcs/courses.json")["courses"]
tt = load("data/linkcs/timetable.json")
rooms = load("data/institute/rooms.json")["rooms"]
cal = load("data/institute/calendar.json")

room_codes = set(rooms) | {a for r in rooms.values() for a in r.get("aliases", [])}
KINDS = set(tt["kinds"])
GROUPS = {int(g) for g in tt["groups"]}
DAYS = set(tt["days"])

used_courses = set()
for day, blocks in tt["week"].items():
    if day not in DAYS:
        bad(f"timetable: day {day!r} is not in days{sorted(DAYS)}")
    for b in blocks:
        where = f"{tt['days'].get(day, day)} {b['start']}"
        used_courses.add(b["course"])
        if b["course"] not in courses:
            bad(f"{where}: course {b['course']!r} is not in courses.json")
        if b["room"] and b["room"] not in room_codes:
            bad(f"{where}: room {b['room']!r} is not in rooms.json")
        if b["kind"] not in KINDS:
            bad(f"{where}: kind {b['kind']!r} is not one of {sorted(KINDS)}")
        if b["group"] not in GROUPS:
            bad(f"{where}: group {b['group']!r} is not one of {sorted(GROUPS)}")
        if b["end"] <= b["start"]:
            bad(f"{where}: ends {b['end']} at or before it starts")

for code in courses:
    if code not in used_courses:
        bad(f"courses.json: {code} has no block in the week (dropped from the grid?)")

labels = {}
for code, c in courses.items():
    for field in ("name", "short"):
        if not c.get(field):
            bad(f"courses.json: {code} has no {field}")
    label = f"{code} ({c.get('short')})"
    if label in labels:
        bad(f"courses.json: {code} and {labels[label]} both print as {label!r}")
    labels[label] = code

start, end = cal["term"]["start"], cal["term"]["end"]
for day in cal["noClass"]:
    if not (start <= day <= end):
        bad(f"calendar.json: no-class day {day} falls outside the term ({start}..{end})")

# a generated file that has drifted from its source is worse than no generator
gen = ROOT / "js" / "gen" / "data.js"
if not gen.exists():
    bad("js/gen/data.js is missing - run tools/build_data.py")
else:
    was = gen.read_text()
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_data.py")],
                   check=True, capture_output=True)
    if gen.read_text() != was:
        bad("js/gen/data.js was STALE - it has just been regenerated, commit it")

if problems:
    print(f"{len(problems)} problem(s):")
    for p in problems:
        print("  -", p)
else:
    print(f"OK - {len(courses)} courses, "
          f"{sum(len(v) for v in tt['week'].values())} blocks, {len(rooms)} rooms")
    print("     every course and room a block names exists; no duplicate labels")
sys.exit(len(problems))
