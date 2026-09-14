#!/usr/bin/env python3
"""Read what people reported during the mess trial.

The trial only pays off if someone looks at it. This pulls the raw tail of
reports and the per-cell counts straight out of the store, so the question
"how often is the sheet right" gets an answer instead of an impression.

Needs the same two variables the endpoint uses:

    export KV_REST_API_URL=...      # or UPSTASH_REDIS_REST_URL
    export KV_REST_API_TOKEN=...    # or UPSTASH_REDIS_REST_TOKEN
    python3 tools/mess_reports.py

    python3 tools/mess_reports.py --cell 1 lunch Monday    one cell's counts
"""
import argparse
import collections
import json
import os
import sys
import urllib.request

# Both namings, same as api/report.js. The endpoint learned this and this tool
# did not, which is exactly how two halves of one feature drift apart.
URL = os.environ.get("UPSTASH_REDIS_REST_URL") or os.environ.get("KV_REST_API_URL")
TOKEN = (os.environ.get("UPSTASH_REDIS_REST_TOKEN")
         or os.environ.get("KV_REST_API_TOKEN"))


def redis(*cmd):
    req = urllib.request.Request(
        URL, data=json.dumps(list(cmd)).encode(),
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())["result"]


def main():
    if not URL or not TOKEN:
        sys.exit("set KV_REST_API_URL and KV_REST_API_TOKEN (or the "
                 "UPSTASH_REDIS_REST_* names) - Vercel > project > Storage")
    ap = argparse.ArgumentParser()
    ap.add_argument("--cell", nargs=3, metavar=("WEEK", "MEAL", "DAY"))
    ap.add_argument("--raw", type=int, default=40,
                    help="how many recent reports to print")
    a = ap.parse_args()

    if a.cell:
        week, meal, day = a.cell
        flat = redis("HGETALL", f"mess:flags:{week}:{meal}:{day}") or []
        pairs = {flat[i]: int(flat[i + 1]) for i in range(0, len(flat), 2)}
        if not pairs:
            print("  nothing reported for that cell")
            return
        for k, v in sorted(pairs.items(), key=lambda x: -x[1]):
            label = {"__meal__": "WHOLE MEAL was different",
                     "__right__": "looked right"}.get(k, k)
            print(f"  {v:3}  {label}")
        return

    raw = redis("LRANGE", "mess:reports", "0", str(a.raw - 1)) or []
    if not raw:
        print("  no reports yet")
        return
    rows = [json.loads(x) for x in raw]

    kinds = collections.Counter(r.get("kind", "dish") for r in rows)
    right, meal, dish = kinds["right"], kinds["meal"], kinds["dish"]
    print(f"  {len(rows)} recent report(s): {dish} dish, {meal} whole-meal, "
          f"{right} looked-right")
    if right + meal + dish:
        # a crude read, and labelled as one: these are self-selected taps, not
        # a sample, so the number says what people bothered to say and no more
        print(f"  of the taps that judged a whole meal: "
              f"{right} right vs {meal} wrong")

    corrections = [r for r in rows if r.get("instead")]
    if corrections:
        print("\n  what people said was there INSTEAD (the useful ones):")
        for r in corrections:
            print(f"    {r['at'][:10]} W{r['week']} {r['meal']} {r['day']}"
                  f"  {r.get('dish','')!r} -> {r['instead']!r}")

    print("\n  recent:")
    for r in rows[:a.raw]:
        kind = r.get("kind", "dish")
        what = {"meal": "WHOLE MEAL differed", "right": "looked right"}.get(
            kind, r.get("dish", ""))
        print(f"    {r['at'][:16]}  W{r['week']} {r['meal']:9} {r['day']:9} {what}")


if __name__ == "__main__":
    main()
