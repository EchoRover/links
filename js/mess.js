// ============================================================
// MESS PAGE — rendering.
//
// The menu, the serving windows and every time calculation live in
// js/mess-data.js. Nothing below decides WHAT is served or WHEN; it
// only decides how that is drawn.
// ============================================================

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
                    Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
                    Sunday: "Sun" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// how many weeks the strip can page either side of this one
const WEEK_REACH = 1;

// What the controls are currently showing. Set once from the clock, then only
// by the user - a re-render on the minute must never yank the view back to
// today while someone is reading Thursday.
//
// The user picks a DATE. Day-of-week and rotation week are worked out from
// it, so the "which week of the rotation is it" question never reaches the
// screen - that was a second control the person had to get right before the
// first one meant anything.
let view = { meal: null, date: null, day: null, week: null };

function setDate(d) {
    view.date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    view.day = MESS_DAYS[view.date.getDay()];
    view.week = messWeekOf(view.date);
}

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function fmtDate(d) {
    return `${DAY_SHORT[MESS_DAYS[d.getDay()]]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// the Monday on or before a date, at midnight
function mondayOf(d) {
    return addDays(d, -((d.getDay() + 6) % 7));
}

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
        text.innerHTML = `<span class="half"><strong>${esc(s.now.label)}</strong> now</span>` +
            `<span class="half">until ${t12(s.now.end)} (${human(s.untilEnd)})</span>`;
    } else {
        const when = s.tomorrow ? "tomorrow" : "today";
        text.innerHTML = `<span class="half"><strong>${esc(s.next.label)}</strong> ${when} ` +
            `at ${t12(s.next.start)}</span>` +
            `<span class="half">in ${human(s.untilNext)}</span>`;
    }
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

// The week strip: the calendar-app pattern. Seven days fill the row, always
// the same seven columns, so nothing scrolls and nothing is cut off; the
// arrows page a whole week, which is exactly the "one week back, one week
// forward" that a two-week rotation needs. Today is a ring, the selection is
// a filled disc - two separate facts, drawn two separate ways, the way every
// calendar does it. It replaces a seven-way day control AND a week control:
// the rotation week is read off the date and never reaches the screen.
//
// Paging moves the selection with it (same weekday, next week) - the menu
// is the thing being read, and a row showing next week while the menu still
// showed this one would be two views disagreeing on one screen. Bounded to
// a week either side: that is the whole rotation for any weekday.
//
// Rebuilt only when today or the selection moves; draw() runs every thirty
// seconds and there is no reason to touch the DOM under someone's thumb.
let stripKey = null;

function weekBounds(now) {
    const thisMon = mondayOf(now);
    return { first: addDays(thisMon, -7 * WEEK_REACH),
             last: addDays(thisMon, 7 * WEEK_REACH) };
}

function renderDays(now) {
    const key = [now.toDateString(), view.date.toDateString()].join("|");
    if (key === stripKey) return;
    stripKey = key;

    const mon = mondayOf(view.date);
    const sun = addDays(mon, 6);
    const { first, last } = weekBounds(now);
    document.getElementById("wk-prev").disabled = mon <= first;
    document.getElementById("wk-next").disabled = mon >= last;
    document.getElementById("wk-label").innerHTML =
        `${fmtDate(mon)} &ndash; ${fmtDate(sun)}`;

    const out = [];
    for (let i = 0; i < 7; i++) {
        const d = addDays(mon, i);
        const on = sameDay(d, view.date);
        const today = sameDay(d, now);
        out.push(
            `<button type="button" role="tab" aria-selected="${on}" ` +
            `data-date="${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}" ` +
            `aria-label="${fmtDate(d)}${today ? ", today" : ""}" ` +
            `class="day${on ? " on" : ""}${today ? " today" : ""}">` +
            `<span class="day-name">${DAY_SHORT[MESS_DAYS[d.getDay()]]}</span>` +
            `<span class="day-num">${d.getDate()}</span></button>`);
    }
    document.getElementById("day-strip").innerHTML = out.join("");
}

function renderControls(now) {
    seg("seg-meal", MEAL_ORDER.map(m => ({
        value: m, label: MESS.service.meals.find(x => x.meal === m).label
    })), view.meal, v => { view.meal = v; });
    renderDays(now);
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

// The 30-second tick re-runs draw(), and a blind re-render would close every
// revealed "not this" and wipe a half-typed "what was there instead" box. The
// menu only depends on these four things, so when none of them moved there is
// nothing to redraw.
let drawnKey = null;

function renderMenu() {
    const body = document.getElementById("mess-body");
    const courses = messMenu(view.week, view.meal, view.day);
    const win = messWindow(view.meal, view.day);

    document.getElementById("mess-window").textContent =
        win ? `${win.label} · ${t12(win.start)} – ${t12(win.end)}` : "";

    const key = [view.week, view.meal, view.day, trialOpen()].join("|");
    if (key === drawnKey) return;
    drawnKey = key;

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
            <h2 class="main-name">${esc(c.course)}${
                many ? `<span class="main-pick">pick one</span>` : ""}</h2>
            <ul class="main-items">${c.items.map(i =>
                `<li>${dishHTML(c.course, i)}</li>`).join("")}</ul>
        </article>`;
    }).join("");

    // The rest is reference, not a decision, so it is set as tight label/value
    // pairs that can be skimmed down rather than read across.
    const restHTML = rest.map(c => `<div class="side">
        <dt>${esc(c.course)}</dt>
        <dd>${c.items.map(i => dishHTML(c.course, i))
                     .join(" <i>or</i> ")}</dd>
    </div>`).join("");

    body.innerHTML =
        (mainHTML ? `<div class="mains">${mainHTML}</div>` : "") +
        (restHTML ? `<h3 class="rest-head">and with it</h3>
                     <dl class="sides">${restHTML}</dl>` : "") +
        trialHTML();
}

// Every dish carried its own "not this" button, always on screen. Fifteen of
// them down a page is a column of controls with the food threaded through it,
// and the thing the page exists to show competes with a thing almost nobody
// taps. So the dish itself is the control: tap the name, the button appears
// under it. One tap to reach it, none to ignore it. Not hover - this is opened
// on a phone, where hover does not exist.
//
// Already-reported dishes come back expanded, because "you already told us"
// is worth saying without being asked.
function dishHTML(course, dish) {
    if (!trialOpen()) return esc(dish);
    const done = sentSet().has(cellId(dish));
    return `<span class="dish">` +
        `<button type="button" class="dish-name" aria-expanded="${done}" ` +
        `title="Not what was served? Tap.">${esc(dish)}</button>` +
        flagHTML(course, dish, done) + `</span>`;
}

function flagHTML(course, dish, done) {
    return `<button type="button" class="flag${done ? " done" : ""}" ` +
        `${done ? "" : "hidden "}` +
        `data-dish="${esc(dish)}" data-course="${esc(course)}" ` +
        `aria-label="${done ? "Already reported" : "Report: this was not served"}" ` +
        `title="${done ? "You reported this" : "Not what was served?"}">` +
        `${done ? "reported" : "not this"}</button>`;
}

function trialHTML() {
    if (!trialOpen()) {
        return TRIAL ? `<p class="trial-over">The reporting trial ended
            ${esc(TRIAL.until)}. Thanks to everyone who tapped.</p>` : "";
    }
    const mealDone = sentSet().has(cellId("__meal__"));
    const rightDone = sentSet().has(cellId("__right__"));
    return `<section class="trial">
        <h3>Two-week trial &mdash; help check this</h3>
        <p>Nobody knows how closely the mess follows the printed sheet. Tap
           any dish that was not served, then <b>not this</b>, and say what
           turned up instead if you can be bothered. Anonymous, no account,
           nothing else asked. Running until ${esc(TRIAL.until)}.</p>
        <div class="trial-acts">
            <button type="button" class="trial-btn" data-kind="right"
                ${rightDone ? "disabled" : ""}>
                ${rightDone ? "you said it looked right" : "This looked right"}</button>
            <button type="button" class="trial-btn warn" data-kind="meal"
                ${mealDone ? "disabled" : ""}>
                ${mealDone ? "you said the whole meal differed"
                           : "Whole meal was different"}</button>
        </div>
        <p class="trial-say" id="trial-say"></p>
    </section>`;
}

// Only speaks when the view has been moved off today, so the line is silent in
// the common case and load-bearing when it appears. Browsing a different MEAL
// of today is not browsing a different day, and saying "not today" for it was
// simply false.
// Only speaks when there is a real gap. The standing "read off photographs of
// the wall" line is gone: the banner at the top already says the mess has not
// read this menu, and a second hedge at the bottom was the same admission in
// smaller type. A whole menu says nothing; a menu missing two of its six
// sheets still has to say so.
function renderNote() {
    const el = document.getElementById("mess-note");
    const gaps = MESS.menu.incomplete;
    if (gaps && gaps.length) {
        el.textContent = `Incomplete — still missing ${gaps.join(", ")}.`;
        el.style.color = "var(--red)";
        el.hidden = false;
        return;
    }
    el.textContent = "";
    el.hidden = true;
}

// The way back to today lives on this line rather than in the strip: the
// line only exists when you are away from today, which is the only time a
// "Today" control has anything to do.
function renderViewing(now) {
    const el = document.getElementById("mess-viewing");
    el.innerHTML = sameDay(view.date, now) ? "" :
        `Showing <b>${fmtDate(view.date)}</b> — not today. ` +
        `<button type="button" class="today-link" id="btn-today">Back to today</button>`;
}

function draw() {
    const now = new Date();
    renderStatus(now);
    renderControls(now);
    renderMenu();
    renderViewing(now);
    renderNote();
}

// Where the page opens: what someone walking to the mess wants, which is the
// meal being served, or the next one if nothing is.
//
// The day moves to tomorrow ONLY when nothing is on now and the next meal is
// tomorrow's. It used to move whenever messStatus said `tomorrow`, and during
// dinner "next" is always tomorrow's breakfast, so for the whole of dinner,
// every night, the page opened on the wrong day while the status line said
// "Dinner now" (found live 2026-09-15 at 20:30). The week is worked out from
// the actual date rather than copied from today, so a Sunday night after
// dinner lands on the right Monday.
function livePosition(now) {
    const live = messStatus(now);
    if (live.now || !live.tomorrow) {
        return { meal: live.now ? live.now.meal : live.next.meal, date: now };
    }
    const d2 = new Date(now);
    d2.setDate(d2.getDate() + 1);
    return { meal: live.next.meal, date: d2 };
}

// Back to today. The date only - the meal is its own control, sitting right
// there, and a button called "Today" that also changed the meal would be
// doing something its label does not say.
function goToday() {
    setDate(new Date());
    draw();
}

function start() {
    if (typeof MESS === "undefined") return;
    const open = livePosition(new Date());
    view.meal = open.meal;
    setDate(open.date);
    draw();
    setInterval(draw, 30000);
    document.getElementById("day-strip").addEventListener("click", e => {
        const b = e.target.closest("button[data-date]");
        if (!b) return;
        const [y, m, d] = b.dataset.date.split("-").map(Number);
        setDate(new Date(y, m - 1, d));
        draw();
    });
    document.getElementById("wk-prev").addEventListener("click", () => {
        setDate(addDays(view.date, -7)); draw();
    });
    document.getElementById("wk-next").addEventListener("click", () => {
        setDate(addDays(view.date, 7)); draw();
    });
    // the button is re-rendered with the line it sits on, so listen above it
    document.getElementById("mess-viewing").addEventListener("click", e => {
        if (e.target.closest("#btn-today")) goToday();
    });
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

// ============================================================
// TRIAL REPORTING — two weeks of "is this actually what you ate".
//
// The menu is transcribed from photographs of a wall and the mess does not
// follow it exactly. How far off it runs is unknown, and one lunch on a
// festival day is not a measurement, so rather than guess at a disclaimer the
// page asks for a fortnight.
//
// Three taps, in descending order of how useful each is:
//   "not this" on a dish, with an optional box for what turned up instead -
//        the only report that can ever fix the menu rather than just doubt it
//   "whole meal was different" - one tap instead of fourteen, and it keeps a
//        festival from reading as fourteen separate failures of the sheet
//   "looked right" - so the rate has a denominator. Without it the only thing
//        ever recorded is complaints.
//
// It degrades: if /api/report has no store behind it, taps are remembered in
// this browser and the page says the trial is not recording. A tap that
// silently goes nowhere would be worse than no button.
// ============================================================

const TRIAL = MESS.service.trial || null;
const SENT = "linkcs_mess_reported";

function trialOpen() {
    if (!TRIAL) return false;
    return new Date().toISOString().slice(0, 10) <= TRIAL.until;
}

function sentSet() {
    try { return new Set(JSON.parse(localStorage.getItem(SENT) || "[]")); }
    catch { return new Set(); }
}

function remember(id) {
    const s = sentSet();
    s.add(id);
    try { localStorage.setItem(SENT, JSON.stringify([...s])); } catch { }
}

function cellId(extra) {
    return [view.week, view.meal, view.day, extra].join("|");
}

async function send(payload) {
    const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: view.week, meal: view.meal,
                               day: view.day, ...payload }),
    });
    return r.json();
}

// ---------- what happens on a tap ----------
//
// Optimistic: the button changes the moment it is pressed. A tap that appears
// to do nothing for a second reads as broken and gets pressed again, and the
// report is worth less than the person's willingness to keep helping.

function feedback(msg, bad) {
    const el = document.getElementById("trial-say");
    if (!el) return;
    el.textContent = msg;
    el.className = "trial-say" + (bad ? " bad" : "");
}

async function report(payload, btn, doneLabel) {
    const id = cellId(payload.dish || `__${payload.kind}__`);
    remember(id);
    if (btn) { btn.disabled = true; btn.classList.add("done"); btn.textContent = doneLabel; }
    try {
        const r = await send(payload);
        if (r && r.ok) {
            feedback(r.already ? "Already had yours, thanks." : "Logged. Thanks.");
        } else {
            feedback("Saved on this device only — the trial is not recording yet.", true);
        }
    } catch {
        feedback("Saved on this device only — could not reach the server.", true);
    }
}

// The optional half: after flagging, ask what it WAS. Skippable, and the flag
// is already counted whether or not anyone fills it in.
function askInstead(li, course, dish) {
    if (li.querySelector(".instead")) return;
    const box = document.createElement("form");
    box.className = "instead";
    box.innerHTML = `<input type="text" maxlength="120"
            placeholder="what was there instead? (optional)" aria-label="What was served instead">
        <button type="submit">send</button>`;
    box.addEventListener("submit", async e => {
        e.preventDefault();
        const v = box.querySelector("input").value.trim();
        box.remove();
        if (!v) return;
        try {
            const r = await send({ kind: "dish", course, dish, instead: v });
            feedback(r && r.ok ? "Got it — thanks, that is the useful bit."
                               : "Saved on this device only.", !(r && r.ok));
        } catch { feedback("Could not reach the server.", true); }
    });
    li.appendChild(box);
    box.querySelector("input").focus();
}

document.addEventListener("click", e => {
    const name = e.target.closest(".dish-name");
    if (name) {
        const flag = name.parentElement.querySelector(".flag");
        if (flag) {
            flag.hidden = !flag.hidden;
            name.setAttribute("aria-expanded", String(!flag.hidden));
        }
        return;
    }
    const flag = e.target.closest(".flag");
    if (flag && !flag.classList.contains("done")) {
        const { dish, course } = flag.dataset;
        report({ kind: "dish", course, dish }, flag, "reported");
        askInstead(flag.closest("li, dd") || flag.parentElement, course, dish);
        return;
    }
    const btn = e.target.closest(".trial-btn");
    if (btn && !btn.disabled) {
        const kind = btn.dataset.kind;
        report({ kind }, btn,
               kind === "meal" ? "you said the whole meal differed"
                               : "you said it looked right");
    }
});
