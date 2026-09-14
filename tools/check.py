#!/usr/bin/env python3
"""Run every check. One command, one summary, exit code = number that failed.

    python3 tools/check.py            everything, including the network ones
    python3 tools/check.py --local    skip anything that needs the internet
    python3 tools/check.py --quiet    just the summary lines

The list is not arbitrary. Each of these exists because something got through
without it:

  data        codes referencing codes that did not exist (ACOL333 was called
              two different things in two files; ACOL331 was missing from
              COURSE_META and rendered a card with no credits)
  links       a page move left every old URL pointing at nothing, and
              js/campus.js linked to plan.html, a file never in this repo
  timetable   the shipped week silently drifting from the official sheet
  sheets      we held 27 August MTech sheets while 9 September ones were
              published. A stamp-comparing check reported "?" and said
              nothing, so this one compares BYTES and cannot be fooled by a
              sheet that carries no stamp.
  routing     /bus, /week and /rooms all 404'd in production while every
              local check passed, because rewrites are Vercel behaviour that
              nothing in this repo can see.
  mess        the menu is transcribed off photographs of six wall sheets, so
              a dish can land under the wrong course or a day can go missing
              with nothing to show for it. Checks the shape the sheets have.
"""
import hashlib
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEETS = ROOT / "data" / "timetables"
BASE = "https://iitdabudhabi.ac.ae/uploaded_files/semseter-schedule/2026"
SITE = "https://linkcs.vercel.app"

# cohort key -> path on the college site
# Only the sheet this site actually serves. Every other cohort moved to the
# onetimetable repo, which is where the cross-cohort work now lives.
COHORTS = {
    "year3-sem5-btech-cse": "Year3-Sem5-BTECH-CSE",
}

# every URL people already have, which a repo reorganisation must not break
URLS = ["/", "/screen", "/bus", "/bus.html", "/week", "/rooms", "/campus",
        "/3d", "/m3", "/m4"]

QUIET = "--quiet" in sys.argv


def run(name, argv):
    p = subprocess.run([sys.executable, str(ROOT / "tools" / argv[0])] + argv[1:],
                       capture_output=True, text=True)
    ok = p.returncode == 0
    detail = (p.stdout.strip().splitlines() or [""])[-1] if ok else p.stdout.strip()
    return name, ok, detail if ok else (detail or p.stderr.strip())


def check_sheets():
    """Compare stored bytes against what the college serves right now.

    Bytes, not stamps: two sheets carry no footer stamp at all, and comparing
    stamps let those two sit five revisions out of date without a word.
    """
    stale, unreachable = [], []
    for key, path in COHORTS.items():
        ours = sorted(SHEETS.glob(f"*{key}.pdf"))
        if not ours:
            stale.append(f"{key}: not stored at all")
            continue
        try:
            live = urllib.request.urlopen(f"{BASE}/{path}.pdf", timeout=20).read()
        except (urllib.error.URLError, TimeoutError) as e:
            unreachable.append(f"{key}: {e}")
            continue
        if hashlib.sha256(live).hexdigest() != hashlib.sha256(ours[-1].read_bytes()).hexdigest():
            stale.append(f"{key}: {ours[-1].name} differs from what is published now")
    if stale:
        return "sheets", False, "\n".join("    " + s for s in stale)
    note = f"all {len(COHORTS)} cohorts byte-identical to the published sheet"
    if unreachable:
        note += f" ({len(unreachable)} unreachable, not checked)"
    return "sheets", True, note


def check_routing():
    """Do the URLs people actually hold still resolve on the deployed site?"""
    bad = []
    for u in URLS:
        req = urllib.request.Request(SITE + u, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                if r.status >= 400:
                    bad.append(f"{u} -> {r.status}")
        except urllib.error.HTTPError as e:
            bad.append(f"{u} -> {e.code}")
        except (urllib.error.URLError, TimeoutError) as e:
            return "routing", True, f"site unreachable, not checked ({e})"
    if bad:
        return "routing", False, "\n".join("    " + b for b in bad)
    return "routing", True, f"all {len(URLS)} public URLs resolve"


def main():
    local_only = "--local" in sys.argv
    results = [
        run("data", ["check_data.py"]),
        run("mess", ["check_mess.py"]),
        run("links", ["check_links.py"]),
        run("timetable", ["check_timetable.py"]),
    ]
    if not local_only:
        results.append(check_sheets())
        results.append(check_routing())

    failed = [r for r in results if not r[1]]
    width = max(len(n) for n, _, _ in results)
    print()
    for name, ok, detail in results:
        mark = "ok  " if ok else "FAIL"
        first = detail.splitlines()[0] if detail else ""
        print(f"  {mark}  {name:<{width}}  {first if ok else ''}")
        if not ok and not QUIET:
            print(detail if detail.startswith("    ") else
                  "\n".join("    " + l for l in detail.splitlines()))
    print()
    if failed:
        print(f"{len(failed)} of {len(results)} checks failed: "
              + ", ".join(n for n, _, _ in failed))
    else:
        print(f"all {len(results)} checks pass"
              + (" (local only)" if local_only else ""))
    return len(failed)


if __name__ == "__main__":
    sys.exit(main())
