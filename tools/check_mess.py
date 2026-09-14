#!/usr/bin/env python3
"""Check the mess menu before it can go on the site.

The menu was transcribed from photographs of six sheets taped to a wall, which
is the kind of job that goes wrong quietly - a dish lands under the wrong
course, a day gets skipped, a cell comes back empty and nobody notices until
someone walks to the mess for a breakfast that is not being served.

So the structure is checked rather than trusted. The sheets have a shape, and
the shape is the invariant: the same courses in the same order for a given meal
in both weeks, seven days in every course, and a course's alternatives numbering
the same on every day of the week.

    python3 tools/check_mess.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MENU = ROOT / "data" / "mess" / "menu.json"
SERVICE = ROOT / "data" / "mess" / "service.json"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        "Sunday"]
MEALS = ["breakfast", "lunch", "dinner"]

# A course offers the same number of choices every day of the week - except
# where the printed sheet merges a cell across its own sub-rows, which is a
# real thing the mess does and not a dropped dish. Each one is listed here with
# what the sheet actually shows, so the rule still catches the case it exists
# for: a dish that went missing in transcription.
UNEVEN = {
    ("1", "lunch", "SPECIAL DISH"): (
        "Thu and Fri print one merged yellow cell across both sub-rows - "
        "Thu 'Rice Bowl with Rajma Masala or Kadhi Pakora with Papad', "
        "Fri 'Panjabi Samosa Chat (...)'. Checked against the photograph "
        "14 Sep 2026."),
}


def main():
    if not MENU.exists():
        sys.exit(f"{MENU.relative_to(ROOT)} does not exist yet")
    menu = json.loads(MENU.read_text())
    service = json.loads(SERVICE.read_text())
    fails, allowed, dishes = [], [], 0

    served = {m["meal"] for m in service["meals"]}
    if served != set(MEALS):
        fails.append(f"service.json covers {sorted(served)}, menu has {MEALS}")

    for meal in MEALS:
        shapes = {}
        for week in ("1", "2"):
            sheet = menu.get(week, {}).get(meal)
            if not sheet:
                fails.append(f"week {week} {meal}: missing entirely")
                continue
            names = [c["course"] for c in sheet]
            if len(names) != len(set(names)):
                dupes = sorted({n for n in names if names.count(n) > 1})
                fails.append(f"week {week} {meal}: course listed twice: {dupes}")
            shapes[week] = names

            for course in sheet:
                cells = course["cells"]
                missing = [d for d in DAYS if d not in cells]
                if missing:
                    fails.append(f"week {week} {meal} {course['course']}: "
                                 f"no {', '.join(missing)}")
                    continue
                counts = {d: len(cells[d]) for d in DAYS}
                if 0 in counts.values():
                    empty = [d for d in DAYS if not counts[d]]
                    fails.append(f"week {week} {meal} {course['course']}: "
                                 f"empty on {', '.join(empty)}")
                if len(set(counts.values())) > 1:
                    known = UNEVEN.get((week, meal, course["course"]))
                    if known:
                        allowed.append(f"week {week} {meal} "
                                       f"{course['course']}: {known}")
                    else:
                        fails.append(
                            f"week {week} {meal} {course['course']}: a course "
                            f"has the same number of choices every day, but "
                            f"this one has {counts}")
                for day in DAYS:
                    for item in cells[day]:
                        dishes += 1
                        if not item.strip():
                            fails.append(f"week {week} {meal} "
                                         f"{course['course']} {day}: blank")
                        if "UNREADABLE" in item.upper():
                            fails.append(f"week {week} {meal} "
                                         f"{course['course']} {day}: could not "
                                         f"be read off the photo")

        if len(shapes) == 2 and shapes["1"] != shapes["2"]:
            only1 = [c for c in shapes["1"] if c not in shapes["2"]]
            only2 = [c for c in shapes["2"] if c not in shapes["1"]]
            if only1 or only2:
                fails.append(f"{meal}: week 1 and week 2 list different "
                             f"courses - only in w1 {only1}, only in w2 {only2}")
            else:
                fails.append(f"{meal}: same courses in a different order - "
                             f"w1 {shapes['1']} vs w2 {shapes['2']}")

    if fails:
        for f in fails:
            print(f"  {f}")
        sys.exit(f"\n{len(fails)} problem(s) with the menu")
    print(f"  ok    mess   2 weeks x 3 meals, {dishes} dishes, "
          f"every course 7 days, choices consistent")
    for a in allowed:
        print(f"          (allowed: {a})")


if __name__ == "__main__":
    main()
