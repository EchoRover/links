# 🔗 CSE Year 2 Links

A lightweight link hub for **IIT Delhi Abu Dhabi — BTech CSE Year 2** students. One page with every resource you need: course pages, LMS portals, upcoming assignments, and quizzes — all in one place.

> **Live site:** Hosted via GitHub Pages at [EchoRover/links](https://echorover.github.io/links/)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Course Links** | Quick-access buttons for each course's lectures, assignments, Blackboard, Piazza, Gradescope, etc. |
| **General Links** | ERP, Teams, Outlook, Blackboard, Academic Calendar, and Timetable |
| **Updates Board** | Assignments and quizzes with due dates — expired items auto-hide based on the current date |
| **Dark / Light Theme** | Toggles with the ◐ button; respects system preference on first load and persists choice via `localStorage` |
| **Responsive Layout** | Flexbox grid that adapts from desktop to mobile; images stack vertically on small screens |

---

## 📁 Project Structure

```
links/
├── index.html      # Main HTML page
├── styles.css      # Full theme system (CSS custom properties) + responsive styles
├── scripts.js      # Link data, update entries, rendering logic, and theme toggle
├── circle.png      # Logo / circle badge
├── text.png        # Text logo (inverts in dark mode)
├── hacker.png      # Favicon
├── horizontal.png  # Branding asset
├── vertical.png    # Branding asset
├── image.png       # Branding asset
└── theimage.png    # Branding asset
```

---

## 🚀 Getting Started

No build tools or dependencies required — it's a static site.

1. **Clone the repo**
   ```bash
   git clone https://github.com/EchoRover/links.git
   cd links
   ```

2. **Open locally**
   Open `index.html` in any browser, or use a local server:
   ```bash
   npx serve .
   ```

---

## ✏️ How to Update

### Adding / editing course links

Edit the `linksData` object at the top of `scripts.js`:

```js
courses: {
  "ACOL216 (Comp Arch)": {
    "Lectures": "https://...",
    "Assignments": "https://...",
    ...
  },
}
```

### Adding an update (assignment / quiz)

Call `addUpdate()` anywhere before the `DOMContentLoaded` listener in `scripts.js`:

```js
addUpdate("assignments", "ACOL216: Lab Report, 15/03/2026", "2026-3-15");
addUpdate("quizzes", "AAIL100: Quiz 2, 20/03/2026", "2026-3-20");
```

- **First arg** — category (`"assignments"` or `"quizzes"`)
- **Second arg** — display text (use `"Title, date"` format for two-column layout)
- **Third arg** — expiry date in `YYYY-M-D` format (item hides after this date)

---

## 🎨 Theming

The color system is built with CSS custom properties under `:root[data-theme="light"]` and `:root[data-theme="dark"]` in `styles.css`. Each palette (text, background, primary, secondary, accent) has shades from 50–950 that are swapped between themes.

---

## 📄 License

This project is open source. Feel free to fork and adapt it for your own university or program.
