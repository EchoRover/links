#!/usr/bin/env python3
"""How linkCS is used: page views, devices, hours, phones vs laptops, taps.

Reads the public aggregates from /api/hit (counts only, nothing about anyone),
so it needs no store token:

    python3 tools/stats.py            last 14 days
    python3 tools/stats.py 30         last 30 days
    python3 tools/stats.py 7 --json   raw numbers

"devices" is distinct browsers (a random id each browser keeps), so one person
on a phone and a laptop is two, and clearing site data makes a new one.
"""
import collections
import json
import sys
import urllib.request

BASE = "https://linkcs.vercel.app/api/hit"


def bar(n, top, width=24):
    return "#" * max(1, round(width * n / top)) if n else ""


def table(title, counter, limit=15):
    if not counter:
        return
    print(f"\n{title}")
    top = max(counter.values())
    for k, v in counter.most_common(limit):
        print(f"  {v:6}  {k:<34} {bar(v, top)}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    days = int(args[0]) if args else 14
    with urllib.request.urlopen(f"{BASE}?days={days}", timeout=20) as r:
        data = json.loads(r.read())
    if "--json" in sys.argv:
        print(json.dumps(data, indent=1))
        return
    if not data.get("ok"):
        sys.exit(f"endpoint said: {data}")

    rows = data["days"]
    views, hours, kind, ref, clicks = (collections.Counter() for _ in range(5))
    for d in rows:
        views.update(d["views"]); hours.update(d["hours"]); kind.update(d["kind"])
        ref.update(d["ref"]); clicks.update(d["clicks"])

    print(f"linkCS, last {days} days: {sum(views.values())} views, "
          f"{data['devicesInWindow']} distinct devices")

    print("\nper day            views  devices")
    top = max((sum(d["views"].values()) for d in rows), default=0) or 1
    for d in reversed(rows):
        v = sum(d["views"].values())
        print(f"  {d['day']}  {v:6}  {d['devices']:7}  {bar(v, top)}")

    table("pages", views)
    table("phone / tablet / desktop", kind)
    table("came from", ref)
    print("\nhour of day (Abu Dhabi)")
    top = max(hours.values(), default=0) or 1
    for h in range(24):
        n = hours.get(str(h), 0)
        if n:
            print(f"  {h:02}:00  {n:6}  {bar(n, top)}")
    table("most tapped links (page, link)", clicks, limit=25)


if __name__ == "__main__":
    main()
