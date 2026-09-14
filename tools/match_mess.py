#!/usr/bin/env python3
"""Which cell of the menu does a real meal actually match?

The point of the mess page is to say what is being served. The first day it
was checked against the counter, lunch was vada pav and the page said chicken
tikka rolls - so before blaming the mess, the cheap thing to rule out is that
we are showing the WRONG CELL: the rotation anchored to the wrong week, or the
sheets simply not being followed.

Give it what you actually ate and it scores every (week, meal, day) cell in the
menu by word overlap and prints the best matches. If today's food scores
highest on today's cell, the data is right and the mess improvises. If it
scores highest on another week or day, the anchor is wrong and that is a bug we
can fix.

    python3 tools/match_mess.py "vada pav" "chole" "jeera rice"
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MENU = ROOT / "data" / "mess" / "menu.json"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        "Sunday"]
# words that appear in half the cells carry no signal
STOP = {"with", "and", "the", "of", "in", "a", "salad", "rice", "fresh",
        "assorted", "mix", "mixed", "served", "sauce", "curry", "masala"}


def words(text):
    return {w for w in re.findall(r"[a-z]+", text.lower())
            if len(w) > 2 and w not in STOP}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    want = set()
    for arg in sys.argv[1:]:
        want |= words(arg)
    if not want:
        sys.exit("nothing distinctive in that - give me dish names")

    menu = json.loads(MENU.read_text())
    scored = []
    for wk in ("1", "2"):
        for meal, sheet in menu[wk].items():
            for day in DAYS:
                bag, dishes = set(), []
                for c in sheet:
                    for item in c["cells"].get(day, []):
                        bag |= words(item)
                        dishes.append(item)
                hit = want & bag
                if hit:
                    scored.append((len(hit), wk, meal, day, sorted(hit), dishes))

    scored.sort(key=lambda r: -r[0])
    if not scored:
        print(f"  no cell in the menu contains any of: {', '.join(sorted(want))}")
        print("  the mess served something that is not on ANY of the six sheets.")
        return
    print(f"looking for: {', '.join(sorted(want))}\n")
    for n, wk, meal, day, hit, dishes in scored[:6]:
        print(f"  {n}/{len(want)} matched  ·  Week {wk} {meal} {day}"
              f"  ({', '.join(hit)})")
    best = scored[0]
    print(f"\nbest cell: Week {best[1]} {best[2]} {best[3]}")
    for d in best[5]:
        print(f"    {d}")


if __name__ == "__main__":
    main()
