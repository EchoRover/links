// ============================================================
// EVERY COHORT'S TIMETABLE — the unlisted reference view.
//
// Zero new data. Everything here is the SAME OCC array the rooms page
// draws from (data/rooms-data.js), generated from the academic office's
// workbooks by onetimetable/tools/gen_rooms_data.py. Pivoted by cohort
// instead of by room.
//
// This page is deliberately not in the nav. The sheets it is built from
// carry real errors - room codes that contradict the room name beside
// them, times that run backwards - and the corrections applied are listed
// in the header of rooms-data.js. It is a reference, not the thing anyone
// should plan a week around; pages/week.html is that, for one cohort,
// and it is the only one mechanically reconciled against a published PDF.
//
// The proportional renderer in week.js is bound to the Sem 5 WEEK global
// and tuned for one cohort's hours. Eleven cohorts span 08:00 to 20:20,
// so this draws a plain day-column grid instead: ordered, not to scale.
// ============================================================

// Defined here rather than pulled from timetable.js. That file needs
// js/gen/data.js loaded first - one cohort's courses, rooms and calendar - and
// this page has no business depending on Y3 CSE's dataset to format a clock.
function tmin(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function t12(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

const TT_DAYS = [1, 2, 3, 4, 5];
const TT_DAY_LABEL = { 1: "Monday", 2: "Tuesday", 3: "Wednesday",
                       4: "Thursday", 5: "Friday" };
const TT_KIND = { lec: "", tut: "tutorial", lab: "lab", proj: "project",
                  help: "help session" };

// cohort -> its blocks, merged so a class taught to several groups at once
// is one entry rather than a stack of identical ones
const BY_PROGRAM = (() => {
    const out = {};
    for (const [day, s, e, code, room, prog, group, kind] of OCC) {
        (out[prog] ??= []).push({ day, s, e, code, room, group, kind,
                                  from: tmin(s), to: tmin(e) });
    }
    for (const prog of Object.keys(out)) {
        out[prog].sort((a, b) => a.day - b.day || a.from - b.from ||
                                 a.code.localeCompare(b.code));
    }
    return out;
})();

const PROG_KEYS = Object.keys(PROGRAMS).filter(k => BY_PROGRAM[k]);

let current = localStorage.getItem("linkcs_cohort") || "y3cse";
if (!BY_PROGRAM[current]) current = PROG_KEYS[0];

function esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function roomLabel(code) {
    const name = ROOM_NAMES[code];
    return name ? `${name} · ${code}` : code;
}

function blockHTML(b) {
    const title = COURSE_TITLES[b.code] || "";
    const kind = TT_KIND[b.kind];
    const tags = [kind, b.group === "all" ? "" : b.group].filter(Boolean);
    return `<article class="tt-block">
        <div class="tt-time">${t12(b.s)} – ${t12(b.e)}</div>
        <div class="tt-code">${esc(b.code)}</div>
        ${title ? `<div class="tt-course">${esc(title)}</div>` : ""}
        <div class="tt-room">${esc(roomLabel(b.room))}</div>
        ${tags.length ? `<div class="tt-tags">${tags.map(x =>
            `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    </article>`;
}

function render() {
    const blocks = BY_PROGRAM[current] || [];
    document.getElementById("tt-tabs").innerHTML = PROG_KEYS.map(k =>
        `<button type="button" data-prog="${k}" class="${k === current ? "on" : ""}">` +
        `${esc(PROGRAMS[k])}</button>`).join("");

    document.getElementById("tt-count").textContent =
        `${blocks.length} scheduled block${blocks.length === 1 ? "" : "s"}`;

    document.getElementById("tt-grid").innerHTML = TT_DAYS.map(d => {
        const day = blocks.filter(b => b.day === d);
        return `<section class="tt-day">
            <h2>${TT_DAY_LABEL[d]}</h2>
            ${day.length ? day.map(blockHTML).join("")
                         : `<p class="tt-none">nothing scheduled</p>`}
        </section>`;
    }).join("");
}

document.getElementById("tt-tabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-prog]");
    if (!b) return;
    current = b.dataset.prog;
    localStorage.setItem("linkcs_cohort", current);
    render();
});

render();

const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });
}
