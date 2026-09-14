// ============================================================
// MESS MENU — EXPERIMENT. Unlisted preview of pages/mess.html.
//
// Same data, same time logic (js/mess-data.js). What differs is the
// presentation, applying research into how real products show a daily
// canteen menu. Five changes, each with the reason it was made:
//
//  1. The live status is a badge, not a caption. "Is it open" is the one
//     question this page exists to answer before anything is read, and
//     every mature version of that pattern (Google's "closes soon",
//     delivery apps' closed banners) treats it as the most prominent
//     object on the page. It has three states, not two - open, closing
//     soon, closed - and the colour is always paired with a word, never
//     carrying the meaning alone.
//  2. The hours line is folded into that badge. Two lines were saying
//     overlapping things.
//  3. An "or" sits in the gutter BETWEEN the mains columns. Three dishes
//     side by side in equal columns is also exactly how you draw a combo
//     where you get all three; the caption above each column was the only
//     thing saying otherwise.
//  4. Day and week are one scrollable strip of 14 chips instead of two
//     segmented controls. Seven segments is already past what a segmented
//     control is for; fourteen across two controls is a lot of chrome for
//     one decision. Today is marked independently of what is selected,
//     the way a calendar does it.
//  5. Dishes carry the FSSAI mark - green square for veg, brown TRIANGLE
//     for non-veg. The triangle is not decoration: FSSAI changed the
//     non-veg mark from a circle to a triangle precisely so it is
//     distinguishable without colour. See DIET below for the large caveat.
// ============================================================

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                   "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
                    Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
                    Sunday: "Sun" };
const MAINS = {
    breakfast: ["MAIN BREAKFAST DISH", "EGG PREPARATION"],
    lunch: ["SPECIAL DISH", "NON VEG PROTEIN", "VEG DISH"],
    dinner: ["SPECIAL DISH", "NON VEG PROTEIN", "VEG DISH"]
};
// under this many minutes left, the badge turns amber
const CLOSING_SOON = 30;

let view = { meal: null, day: null, week: null };

// ---------- diet marks ----------
//
// THE SHEETS DO NOT SAY. Not one of the six carries a veg mark, so every
// mark below is inferred from the words in the dish name and is capable of
// being wrong - a soup made on meat stock reads as veg here, and nothing in
// the data would reveal it. The page says so out loud rather than implying
// the mess certified any of this. The real fix is a diet field captured when
// the sheets are next transcribed; this is a stand-in, and it only marks
// what it has a reason to.
const MEAT = /\b(chicken|mutton|lamb|beef|fish|prawn|shrimp|tuna|salmon|meat|mince|keema|kheema|mortadella|sausage|bacon|ham|pepperoni|anchov|seafood|squid|calamari|turkey|duck|biryani \(no)\b/i;
const EGG = /\b(egg|eggs|omelette|omelet|shakshuka|burji|bhurji)\b/i;
const VEG_COURSES = /^(VEG DISH|DAL|GREEN SALAD|YOGHURT|YOGURT|FRUIT|DESSERT|FRUIT \/ DESSERT|CEREAL|BREAD|STARCH|PASTRY|CHEESE|CONDIMENTS|ACCOMPANIMENTS|CHILLED BEVERAGES|HOT BEVERAGES)$/;

function dietOf(course, dish) {
    if (MEAT.test(dish)) return "nonveg";
    if (EGG.test(dish) || course === "EGG PREPARATION") return "egg";
    if (course === "NON VEG PROTEIN") return "nonveg";
    if (VEG_COURSES.test(course)) return "veg";
    return null;                 // no reason to claim either way
}

function mark(course, dish) {
    const d = dietOf(course, dish);
    if (!d) return "";
    const label = { veg: "vegetarian", nonveg: "non-vegetarian",
                    egg: "contains egg" }[d];
    return `<span class="diet diet--${d}" role="img" aria-label="${label}" ` +
           `title="${label} (inferred from the dish name)"></span>`;
}

// ---------- helpers ----------

function t12(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
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

// ---------- the badge ----------

function renderStatus(now) {
    const s = messStatus(now);
    const el = document.getElementById("status");
    let state, text;
    if (s.now) {
        state = s.untilEnd <= CLOSING_SOON ? "soon" : "open";
        const word = state === "soon" ? "closing soon" : "serving now";
        text = `<b>${esc(s.now.label)}</b> ${word} · ${t12(s.now.start)} – ` +
               `${t12(s.now.end)} · <span class="status-sub">${human(s.untilEnd)} left</span>`;
    } else {
        state = "shut";
        const when = s.tomorrow ? "tomorrow" : "today";
        text = `<b>Closed</b> · ${esc(s.next.label)} ${when} ` +
               `${t12(s.next.start)} – ${t12(s.next.end)} · ` +
               `<span class="status-sub">opens in ${human(s.untilNext)}</span>`;
    }
    el.className = `status status--${state}`;
    el.innerHTML = `<span class="status-dot" aria-hidden="true"></span>` +
                   `<span class="status-text">${text}</span>`;
    return s;
}

// ---------- controls ----------

function renderMeals() {
    const host = document.getElementById("seg-meal");
    host.innerHTML = MESS.service.meals.map(m =>
        `<button type="button" data-meal="${m.meal}" ` +
        `class="${m.meal === view.meal ? "on" : ""}">${esc(m.label)}</button>`).join("");
}

// One strip, both weeks. Today is a dot under the chip, so "today" and
// "what you are looking at" stay separate facts.
function renderDays(live) {
    const host = document.getElementById("day-strip");
    const out = [];
    for (const wk of [1, 2]) {
        for (const d of DAY_ORDER) {
            const on = view.week === wk && view.day === d;
            const today = live.week === wk && live.day === d;
            out.push(
                `<button type="button" role="tab" aria-selected="${on}" ` +
                `data-week="${wk}" data-day="${d}" ` +
                `class="chip${on ? " on" : ""}${today ? " today" : ""}">` +
                `<span class="chip-day">${DAY_SHORT[d]}</span>` +
                `<span class="chip-wk">W${wk}</span></button>`);
        }
    }
    host.innerHTML = out.join("");
    const sel = host.querySelector(".chip.on");
    if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
}

// ---------- the menu ----------

function renderMenu() {
    const body = document.getElementById("body");
    const courses = messMenu(view.week, view.meal, view.day);
    if (!courses.length) {
        body.innerHTML = `<p class="empty">No menu recorded for week ` +
            `${view.week}, ${esc(view.meal)}, ${esc(view.day)}.</p>`;
        return;
    }

    const lead = MAINS[view.meal] || [];
    const mains = lead.map(n => courses.find(c => c.course === n)).filter(Boolean);
    const rest = courses.filter(c => !mains.includes(c));

    const cols = mains.map(c => `<div class="main">
        <h2 class="main-name">${esc(c.course)}</h2>
        <ul class="main-items">${c.items.map(i =>
            `<li>${mark(c.course, i)}${esc(i)}</li>`).join("")}</ul>
    </div>`);
    // the gutter says "or" so the columns cannot read as a three-course plate
    const mainHTML = cols.join(`<span class="or-gutter" aria-hidden="true">or</span>`);

    const restHTML = rest.map(c => `<div class="side">
        <dt>${esc(c.course)}</dt>
        <dd>${c.items.map(i => mark(c.course, i) + esc(i))
                     .join(' <i>or</i> ')}</dd>
    </div>`).join("");

    body.innerHTML =
        (mainHTML ? `<div class="mains">${mainHTML}</div>` : "") +
        (restHTML ? `<h3 class="rest-head">and with it</h3>
                     <dl class="sides">${restHTML}</dl>` : "");
}

function renderNote() {
    const el = document.getElementById("note");
    const gaps = MESS.menu.incomplete;
    el.innerHTML = gaps && gaps.length
        ? `<span class="bad">Incomplete — still missing ${gaps.join(", ")}.</span>`
        : `Beta — read off photographs of the sheets on the mess wall, ` +
          `${esc(MESS.menu.posted_on)}, so it may be wrong or out of date. ` +
          `The wall wins. <b>Veg and non-veg marks are guessed from the dish ` +
          `name</b> — the sheets do not carry them, so a soup made on meat ` +
          `stock will show as vegetarian here.`;
}

function draw() {
    const live = renderStatus(new Date());
    renderMeals();
    renderDays(live);
    renderMenu();
    renderNote();
}

document.getElementById("seg-meal").addEventListener("click", e => {
    const b = e.target.closest("button[data-meal]");
    if (b) { view.meal = b.dataset.meal; draw(); }
});
document.getElementById("day-strip").addEventListener("click", e => {
    const b = e.target.closest("button[data-day]");
    if (b) { view.day = b.dataset.day; view.week = Number(b.dataset.week); draw(); }
});

(function start() {
    if (typeof MESS === "undefined") return;
    const live = messStatus(new Date());
    view = {
        meal: live.now ? live.now.meal : live.next.meal,
        day: live.tomorrow
            ? DAY_ORDER[(DAY_ORDER.indexOf(live.day) + 1) % 7] : live.day,
        week: live.week
    };
    draw();
    setInterval(draw, 30000);
})();

const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });
}
