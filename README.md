# linkCS

A quick-links hub for **IIT Delhi Abu Dhabi — B.Tech CSE Year 3** students. Every course resource, portal, and update worth clicking, on one page.

> **Live site:** [echorover.github.io/links](https://echorover.github.io/links/)
> **Sister site:** [linkeen.vercel.app](https://linkeen.vercel.app) (BTech Energy Engineering)

---

## What's on the page

| Section | What it does |
|---|---|
| **Top bar** | IIT logo, `linkCS` wordmark, `sem v · 2026—27` meta, archive button, theme toggle, LINKEEN cross-link with hover-quotes |
| **Hero** | Big course-program title (`B.Tech / Computer Science / Year 3`) |
| **Quick Links** | Primary daily-use pills (ERP, Teams, Outlook, Blackboard, Timetable) + a `>` button that reveals secondary (Mess, Website, Acd Cal) |
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
├── index.html          # markup + inline JS for canvas/cursor/hide-toggle
├── scripts.js          # course data + COURSE_META + addUpdate calls + renderers
├── styles.css          # theme tokens + all layout
├── README.md
├── assets/
│   ├── circle.png      # red IIT mark
│   ├── text.png        # IITDAD text logo (inverts in dark mode)
│   ├── hacker.png      # favicon
│   └── box.png         # archive icon (inverts in dark mode)
├── archive/            # frozen Year 2 archive, self-contained
│   ├── index.html
│   └── styles.css
└── extras/             # historical files (topics-ahul.html, AHUL213 schedule)
```

Static site, no build step. GitHub Pages serves it directly.

---

## Editing data

### Add or change a course resource link

In `scripts.js`, find `linksData.courses` near the top and edit the course's resource object:

```js
"ACOL333 (AI)": {
  Lectures: "https://...",         // overwrite "#" placeholders with real URLs
  Tutorials: "...",
  "Course Page": "https://...",
  Blackboard: "https://iida.blackboard.com/ultra/courses/_XXX_1/outline",
}
```

### Add or change course title / credits / LTP / department

In `scripts.js`, edit `COURSE_META`:

```js
COURSE_META = {
  ACOL333: { title: "Artificial Intelligence", subtitle: "...", dept: "COMP. SCI.", credits: 4, ltp: "3-0-2" },
  ...
}
```

The first letter of `title` gets the accent color automatically.

### Add an assignment or quiz

Call `addUpdate(...)` anywhere in `scripts.js` before `DOMContentLoaded`:

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

The color system uses CSS custom properties under `:root[data-theme="light"]` and `:root[data-theme="dark"]` in `styles.css`. Main tokens: `--coral` (primary blue), `--cyan`, `--indigo`, `--deep`, `--red`, plus `--bg`, `--fg`, `--rule` families.

Theme is set on first paint from `localStorage` + `prefers-color-scheme`, then toggled with the `◐` button (persists to `localStorage`).

---

## License

Open source. Fork and adapt.
