// ============================================================
// MESS PAGE — rendering.
//
// The menu, the serving windows and every time calculation live in
// js/mess-data.js. Nothing below decides WHAT is served or WHEN; it
// only decides how that is drawn.
// ============================================================

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                   "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
                    Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
                    Sunday: "Sun" };

// What the controls are currently showing. Set once from the clock, then only
// by the user - a re-render on the minute must never yank the view back to
// today while someone is reading Thursday.
let view = { meal: null, day: null, week: null };

function t12(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h < 12 ? "AM" : "PM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function human(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
}

function esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- the live line ----------

function renderStatus(now) {
    const s = messStatus(now);
    const el = document.getElementById("mess-now");
    const text = document.getElementById("mess-now-text");
    el.classList.toggle("open", !!s.now);
    if (s.now) {
        text.innerHTML = `<strong>${esc(s.now.label)}</strong> now &middot; ` +
            `until ${t12(s.now.end)} (${human(s.untilEnd)})`;
    } else {
        const when = s.tomorrow ? "tomorrow" : "today";
        text.innerHTML = `<strong>${esc(s.next.label)}</strong> ${when} at ` +
            `${t12(s.next.start)} &middot; in ${human(s.untilNext)}`;
    }
    document.getElementById("mess-sub").textContent =
        `Week ${s.week} of the rotation. ${s.day}.`;
    return s;
}

// ---------- controls ----------

function seg(id, options, current, onPick) {
    const host = document.getElementById(id);
    host.innerHTML = "";
    for (const o of options) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = o.label;
        b.className = o.value === current ? "on" : "";
        b.addEventListener("click", () => { onPick(o.value); draw(); });
        host.appendChild(b);
    }
}

function renderControls() {
    seg("seg-meal", MEAL_ORDER.map(m => ({
        value: m, label: MESS.service.meals.find(x => x.meal === m).label
    })), view.meal, v => { view.meal = v; });
    seg("seg-day", DAY_ORDER.map(d => ({ value: d, label: DAY_SHORT[d] })),
        view.day, v => { view.day = v; });
    seg("seg-week", [{ value: 1, label: "Week 1" }, { value: 2, label: "Week 2" }],
        view.week, v => { view.week = v; });
}

// ---------- the menu itself ----------

// The courses people actually choose between, per meal. Everything else is
// what comes with it. The printed sheet gives all fifteen rows the same green
// block, which is why it is a wall of text - the pickle gets the same weight as
// the main. Two tiers instead: what you decide on, then what arrives anyway.
const MAINS = {
    breakfast: ["MAIN BREAKFAST DISH", "EGG PREPARATION"],
    lunch: ["SPECIAL DISH", "NON VEG PROTEIN", "VEG DISH"],
    dinner: ["SPECIAL DISH", "NON VEG PROTEIN", "VEG DISH"]
};

function renderMenu() {
    const body = document.getElementById("mess-body");
    const courses = messMenu(view.week, view.meal, view.day);
    const win = messWindow(view.meal, view.day);

    document.getElementById("mess-window").textContent =
        win ? `${win.label} · ${t12(win.start)} – ${t12(win.end)}` : "";

    if (!courses.length) {
        body.innerHTML = `<p class="mess-empty">No menu recorded for week ` +
            `${view.week}, ${esc(view.meal)}, ${esc(view.day)}.</p>`;
        return;
    }

    const lead = MAINS[view.meal] || [];
    const mains = lead.map(n => courses.find(c => c.course === n)).filter(Boolean);
    const rest = courses.filter(c => !mains.includes(c));

    const mainHTML = mains.map(c => {
        const many = c.items.length > 1;
        return `<article class="main">
            <h2 class="main-name">${esc(c.course.toLowerCase())}${
                many ? `<span class="main-pick">pick one</span>` : ""}</h2>
            <ul class="main-items">${c.items.map(i =>
                `<li>${esc(i)}</li>`).join("")}</ul>
        </article>`;
    }).join("");

    // The rest is reference, not a decision, so it is set as tight label/value
    // pairs that can be skimmed down rather than read across.
    const restHTML = rest.map(c => `<div class="side">
        <dt>${esc(c.course.toLowerCase())}</dt>
        <dd>${c.items.map(esc).join(" <i>or</i> ")}</dd>
    </div>`).join("");

    body.innerHTML =
        (mainHTML ? `<div class="mains">${mainHTML}</div>` : "") +
        (restHTML ? `<h3 class="rest-head">and with it</h3>
                     <dl class="sides">${restHTML}</dl>` : "");
}

// Only speaks when the view has been moved off today, so the line is silent in
// the common case and load-bearing when it appears. Browsing a different MEAL
// of today is not browsing a different day, and saying "not today" for it was
// simply false.
function renderViewing(live) {
    const el = document.getElementById("mess-viewing");
    const today = view.day === live.day && view.week === live.week;
    el.innerHTML = today ? "" :
        `Showing <b>week ${view.week}, ${esc(view.day)}</b> — not today.`;
}

// One line, and only when the menu is whole. A page that is missing two of its
// six sheets should say so; a page that has all six has nothing to explain, so
// it just states what it is and when it was read.
// A menu read off a photograph of a wall WILL be wrong sometimes, and the only
// way that gets fixed is someone standing in the mess noticing. So the ask is
// on the page rather than in a README nobody opens - and it names the specific
// things already known to be odd, because "report bugs" gets nothing and
// "is the yoghurt row really bread?" gets an answer.
function renderReport() {
    const el = document.getElementById("mess-report");
    const r = MESS.service.report || {};
    const who = esc(r.who || "whoever runs this");
    el.innerHTML = `
        <h3 class="report-head">Found a mistake?</h3>
        <p>Tell <span id="report-who"><b>${who}</b></span>. The menu is read off
           photographs of the sheets on the mess wall, so a dish can be wrong, a
           week can be out of step, or the mess can simply change what it is
           cooking. Nothing here is checked against the counter.</p>
        <p class="report-known">Already known, and reproduced from the sheet
           rather than corrected: Week&nbsp;1 dinner lists
           <b>yoghurt</b> as &ldquo;Arabic Bread &amp; Soft Roll&rdquo; every
           day, and two Week&nbsp;1 lunch specials are cut off mid-sentence by
           their own cell. Those are on the paper.</p>`;

    // Built rather than interpolated into an href="" - a URL from data does not
    // belong in a template string, and the link checker is right to read one
    // there as a path into this repo.
    if (r.href) {
        const a = document.createElement("a");
        a.className = "report-link";
        a.textContent = r.who || "message";
        a.setAttribute("href", r.href);
        if (/^https?:/i.test(r.href)) {
            a.target = "_blank";
            a.rel = "noopener";
        }
        const slot = document.getElementById("report-who");
        slot.textContent = "";
        slot.appendChild(a);
    }
}

function renderNote() {
    const el = document.getElementById("mess-note");
    const gaps = MESS.menu.incomplete;
    if (gaps && gaps.length) {
        el.textContent = `Incomplete — still missing ${gaps.join(", ")}.`;
        el.style.color = "var(--red)";
        return;
    }
    el.style.color = "";
    el.textContent = `Beta — read off photographs of the sheets on the mess ` +
        `wall, ${MESS.menu.posted_on}, so it may be wrong or out of date. ` +
        `The wall wins.`;
}

function draw() {
    const now = new Date();
    const live = renderStatus(now);
    renderControls();
    renderMenu();
    renderViewing(live);
    renderNote();
    renderReport();
}

function start() {
    if (typeof MESS === "undefined") return;
    const now = new Date();
    const live = messStatus(now);
    // open on what someone walking to the mess wants: the meal being served,
    // or the next one if nothing is
    view = {
        meal: live.now ? live.now.meal : live.next.meal,
        day: live.tomorrow
            ? DAY_ORDER[(DAY_ORDER.indexOf(live.day) + 1) % 7]
            : live.day,
        week: live.week
    };
    draw();
    setInterval(draw, 30000);
}

document.addEventListener("DOMContentLoaded", start);

// The same eight lines sit in scripts.js, bus.js and building.js. Repeated
// rather than shared because each page loads exactly one of those and there is
// no shared bundle; if a fifth copy ever appears, that is the signal to pull
// them all into one file.
const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });
}
