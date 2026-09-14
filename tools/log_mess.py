#!/usr/bin/env python3
"""Record what the mess ACTUALLY served, and score the sheet against it.

The menu is a plan. How closely the mess follows it is unknown - one lunch
where vada pav turned up instead of chicken tikka rolls tells you the sheet is
not gospel, and nothing more. This turns that into something countable: log
what was on the counter, and after a couple of weeks the page can say how often
the sheet is right instead of guessing.

    python3 tools/log_mess.py lunch "vada pav" "chole" "jeera rice"
    python3 tools/log_mess.py --date 2026-09-14 dinner "..." 
    python3 tools/log_mess.py --report

Each entry records the date, meal, what was seen, and which of those the sheet
predicted for that exact cell. Nothing is inferred later - the scoring happens
against the menu as it stands the day it is logged, which is the only honest
comparison once the sheets get reprinted.
"""
import argparse
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from match_mess import words                                  # noqa: E402

MENU = ROOT / "data" / "mess" / "menu.json"
SERVICE = ROOT / "data" / "mess" / "service.json"
LOG = ROOT / "data" / "mess" / "observed.json"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        "Sunday"]


def week_of(date, service):
    c = service["cycle"]
    anchor = datetime.date.fromisoformat(c["anchor_monday"])
    monday = date - datetime.timedelta(days=date.weekday())
    flip = ((monday - anchor).days // 7) % 2
    return c["anchor_week"] if flip == 0 else (2 if c["anchor_week"] == 1 else 1)


def predicted(menu, week, meal, day):
    out = []
    for c in menu[str(week)].get(meal, []):
        out += c["cells"].get(day, [])
    return out


def report(log):
    obs = log["observations"]
    if not obs:
        print("  nothing logged yet - the page claims nothing it cannot show")
        return
    scored = [o for o in obs if not o.get("special")]
    skipped = [o for o in obs if o.get("special")]
    seen = sum(len(o["seen"]) for o in scored)
    hit = sum(len(o["matched"]) for o in scored)
    if seen:
        print(f"  {len(scored)} ordinary meal(s), {seen} dish(es) seen, "
              f"{hit} of them on the sheet  ({hit / seen:.0%})")
    else:
        print("  no ordinary meals logged yet - nothing to draw a rate from")
    for o in skipped:
        print(f"  not counted: {o['date']} {o['meal']} - {o['special']}")
    for o in obs:
        tag = f"  [{o['special']}]" if o.get("special") else ""
        print(f"    {o['date']} {o['meal']:9} W{o['week']} {o['day']:9} "
              f"{len(o['matched'])}/{len(o['seen'])} on the sheet{tag}")
        for miss in o["missed"]:
            print(f"        not on the sheet: {miss}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("meal", nargs="?", choices=["breakfast", "lunch", "dinner"])
    ap.add_argument("dishes", nargs="*")
    ap.add_argument("--date", help="YYYY-MM-DD, default today")
    ap.add_argument("--report", action="store_true")
    # A festival day is the mess deliberately departing from the rotation, not
    # the rotation being unreliable. Counting it would slander the sheet with
    # the one kind of day it was never claiming to cover.
    ap.add_argument("--special", metavar="WHY",
                    help="festival or one-off menu; logged but not scored")
    a = ap.parse_args()

    log = json.loads(LOG.read_text())
    if a.report or not a.meal:
        report(log)
        return
    if not a.dishes:
        sys.exit("give me what was actually served")

    menu = json.loads(MENU.read_text())
    service = json.loads(SERVICE.read_text())
    date = (datetime.date.fromisoformat(a.date) if a.date
            else datetime.date.today())
    day = DAYS[date.weekday()]
    week = week_of(date, service)

    # a dish counts as predicted if its distinctive words appear in that cell
    on_sheet = predicted(menu, week, a.meal, day)
    bag = set()
    for item in on_sheet:
        bag |= words(item)
    matched, missed = [], []
    for d in a.dishes:
        (matched if (words(d) & bag) else missed).append(d)

    entry = {"date": date.isoformat(), "day": day, "week": week,
             "meal": a.meal, "seen": a.dishes, "matched": matched,
             "missed": missed}
    if a.special:
        entry["special"] = a.special
    log["observations"].append(entry)
    LOG.write_text(json.dumps(log, indent=1, ensure_ascii=False) + "\n")
    print(f"  logged {date} {a.meal} (week {week}, {day}): "
          f"{len(matched)}/{len(a.dishes)} were on the sheet")
    for m in missed:
        print(f"    not on the sheet: {m}")
    print()
    report(log)


if __name__ == "__main__":
    main()
