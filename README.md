# linkCS

A quick-links hub for **IIT Delhi Abu Dhabi — B.Tech CSE Year 3** students. Every course resource, portal, and update worth clicking, on one page.

> **Live site:** [linkcs.vercel.app](https://linkcs.vercel.app)
> **Sister site:** [linkeen.vercel.app](https://linkeen.vercel.app) (BTech Energy Engineering)

---

## What's on the page

| Section | What it does |
|---|---|
| **Top bar** | IIT logo, `linkCS` wordmark, `sem v · 2026—27` meta, archive button, theme toggle, LINKEEN cross-link with hover-quotes |
| **Hero** | Big course-program title (`B.Tech / Computer Science / Year 3`) |
| **Quick Links** | Primary daily-use pills (ERP, Teams, Outlook, Blackboard, Timetable, Bus, Rooms) + a `>` button that reveals secondary (Common, Website, Faculty, Acd Cal) |
| **Rooms** | `/rooms.html`, live room occupancy for every classroom and lab from all 11 programs' timetables. Each card shows the current class (course, program, group, time left) and expands to the full day with a Mon to Fri switcher. Data lives in `data/rooms-data.js` |
| **Courses** | Bento grid of course cards: each with code chip, course title with colored first-letter, credits circle, LTP, and 2-column resource grid |
| **Updates** | Assignments + Quizzes columns. Each entry shows a date box (`DOW · DD · MON`) + course code + event text. Expired items auto-hide |
| **Hide button** | Appears at the bottom when scrolled down — toggles content visibility so you can play with the circuit-board background and interactive dots |
| **Year 2 Archive** | The whole previous-year directory frozen at `/archive/`, accessible from the archive button. Independent CSS so nothing breaks if the main site is re-themed |

---

## Visual elements

- **Three-layer circuit board** (SVG) — deepest layer in indigo (heavily blurred), middle in cyan (lightly blurred), top in main blue (sharp). Light pulses zip slowly along each layer's traces via `stroke-dasharray` animation.
- **Interactive dot particles** (canvas) — 18 dots tethered to the top-layer paths. They walk along the traces, get gently pulled toward the cursor, and snap back. Pull too hard and the rope breaks — they drift freely then re-attach to the nearest path.
- **Translucent cover** dims the circuit/dots behind the content. Removed in hide-mode.

---

## Project structure

```
links/
├── index.html          # home: class card, course grid, updates
├── rooms.html          # room occupancy dashboard
├── bus.html            # shuttle schedules
├── common.html         # common free time across programs
├── both.html           # M3 + M4 in 3D (m3.html / m4.html are single-building)
├── campus.html         # campus in 3D
├── planedit.html       # plan-correction tool (deliberately unlinked)
│
├── css/
│   └── styles.css      # theme tokens + all layout
├── js/
│   ├── theme-init.js   # sets the theme in <head> before first paint
│   ├── scripts.js      # course data + COURSE_META + updates + renderers
│   ├── ui.js           # hide-mode, electron canvas, cursor ambient
│   ├── timetable.js    # Sem 5 timetable + room lookup + academic calendar
│   ├── common.js       # common-free-time grid
│   ├── rooms.js        # room dashboard
│   ├── bus.js          # shuttle logic
│   ├── building.js     # shared 3D viewer for m3 / m4 / both
│   ├── campus.js       # campus 3D viewer
│   └── planedit.js     # plan editor
├── data/               # GENERATED — rebuild with tools/, do not hand-edit
│   ├── rooms-data.js   # all 11 programs pivoted by room
│   ├── m3-data.js      # M3 fused model   (tools/fuse_building.py M3)
│   ├── m4-data.js      # M4 fused model   (tools/fuse_building.py M4)
│   ├── campus-data.js  # campus footprints
│   └── boards-data.js  # segmented evacuation boards
├── tools/              # python pipeline: board -> registration -> fused model
├── assets/             # images, timetable + campus PDFs
├── archive/            # frozen Year 2 archive, self-contained
└── extras/             # historical files
```

Static site, no build step. HTML stays at the repo root so every public URL
(`/bus.html`, `/rooms.html`, ...) is unchanged.

---

## Editing data

### Add or change a course resource link

In `js/scripts.js`, find `linksData.courses` near the top and edit the course's resource object:

```js
"ACOL333 (AI)": {
  Lectures: "https://...",         // overwrite "#" placeholders with real URLs
  Tutorials: "...",
  "Course Page": "https://...",
  Blackboard: "https://iida.blackboard.com/ultra/courses/_XXX_1/outline",
}
```

### Add or change course title / credits / LTP / department

In `js/scripts.js`, edit `COURSE_META`:

```js
COURSE_META = {
  ACOL333: { title: "Artificial Intelligence", subtitle: "...", dept: "COMP. SCI.", credits: 4, ltp: "3-0-2" },
  ...
}
```

The first letter of `title` gets the accent color automatically.

### Add an assignment or quiz

Call `addUpdate(...)` anywhere in `js/scripts.js` before `DOMContentLoaded`:

```js
addUpdate("assignments", "ACOL333: Lab 1, 14/09/2026", "2026-9-14");
addUpdate("quizzes",     "ACOL351: Quiz 1, 20/09/2026", "2026-9-20");
```

- Arg 1: `"assignments"` or `"quizzes"`
- Arg 2: `"CODE: event text, DD/MM/YYYY"` — the colon and last comma are parsed to extract the code and date label
- Arg 3: `"YYYY-M-D"` expiry — the item disappears after this date

### Change a quick-link pill

The quick-link pills are hardcoded in `index.html` under the `.hero-quick` and `.quick-secondary` sections. Edit the `<a>` tags directly.

---

## Theming

The color system uses CSS custom properties under `:root[data-theme="light"]` and `:root[data-theme="dark"]` in `css/styles.css`. Main tokens: `--coral` (primary blue), `--cyan`, `--indigo`, `--deep`, `--red`, plus `--bg`, `--fg`, `--rule` families.

Theme is set on first paint from `localStorage` + `prefers-color-scheme`, then toggled with the `◐` button (persists to `localStorage`).

---

## License

Open source — fork and adapt. **Please credit.** If you reuse this,
keep a visible link back to [linkcs.vercel.app](https://linkcs.vercel.app)
or to [github.com/EchoRover/links](https://github.com/EchoRover/links),
and say what you changed.
