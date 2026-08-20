// ============================================================
// SEM 5 TIMETABLE — current + next class on the home page.
//
// Transcribed from the official PDF (iitdabudhabi.ac.ae/timetable ->
// "Year 3 Semester 5 B.TECH Computer Science and Engineering"), read
// off the rendered grid rather than the text layer, then cross-checked
// against every course's L-T-P-C credits — lecture, tutorial and lab
// hours all reconcile, which is what says the block spans are right.
//
// Groups only matter for the two HUL tutorials. Everything else is
// common to both groups, so the toggle changes 3 entries in the week.
// ============================================================

const COURSES = {
    ACOL331: { name: "Operating Systems", prof: "Abhilash Jindal" },
    ACOL333: { name: "Principles of AI", prof: "Sumeet Agarwal" },
    ACOL351: { name: "Algorithms", prof: "Nikhil Balaji C R" },
    AGRL130: { name: "Entrepreneurship", prof: "Joby Joseph · Ashu Verma" },
    AHUL256: { name: "Critical Thinking", prof: "Arjun Ghosh" },
    AHUL261: { name: "Psychology", prof: "Yashpal Jogdand" },
};

// [start, end, code, room, kind, group]
//   kind:  "" lecture · "tut" tutorial · "lab" lab · "free" reserved slot
//   group: 0 both · 1 group 1 only · 2 group 2 only
const WEEK = {
    1: [ // Monday
        ["08:00", "10:00", null, null, "free", 0],
        ["10:00", "11:00", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "12:00", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:30", "AHUL256", "M4-0-011", "", 0],
        ["16:00", "19:00", "AGRL130", "M4-0-011", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "09:00", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "11:00", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "12:00", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:30", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "16:30", "AHUL256", "M4-1-017", "tut", 2],
        ["16:30", "18:00", "ACOL333", "M3-0-022", "", 0],
    ],
    3: [ // Wednesday
        ["08:00", "10:00", "ACOL331", "M3-0-022", "lab", 0],
        ["10:00", "11:00", "ACOL351", "M4.0.019", "tut", 0],
        ["11:00", "12:00", "AHUL261", "M4-1-017", "tut", 2],
        ["14:00", "15:30", "AHUL256", "M4-0-011", "", 0],
        ["15:30", "16:30", "AHUL261", "M4-1-017", "tut", 1],
        ["17:00", "18:00", "AHUL256", "M4-1-017", "tut", 1],
    ],
    4: [ // Thursday
        ["08:00", "09:00", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "11:00", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "12:00", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:30", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "17:30", "ACOL331", "M3-0-022", "lab", 0],
    ],
    5: [ // Friday
        ["09:00", "10:00", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "12:00", null, null, "free", 0],
    ],
};

// From AcademicCalendar-2026-27Sem1.pdf. Showing a class on a day it
// cannot happen is worse than showing nothing, so the term bounds and
// the no-class days are encoded rather than assumed.
const TERM = { start: "2026-08-20", end: "2026-12-16" };
const NO_CLASS = {
    "2026-08-26": "Prophet's Birthday",   // starred on the calendar: government may move it
    "2026-10-02": "Gandhi Jayanti",
    "2026-10-17": "Mid-sem break", "2026-10-18": "Mid-sem break",
    "2026-10-19": "Mid-sem break", "2026-10-20": "Mid-sem break",
    "2026-10-21": "Mid-sem break",
    "2026-10-26": "Mid-sem exams", "2026-10-27": "Mid-sem exams",
    "2026-10-28": "Mid-sem exams", "2026-10-29": "Mid-sem exams",
    "2026-10-30": "Mid-sem exams",
};

const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------- helpers ----------

const tmin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

function t12(t) {
    let [h, m] = t.split(":").map(Number);
    const s = h < 12 ? "am" : "pm";
    let d = h % 12; if (d === 0) d = 12;
    return m ? `${d}:${String(m).padStart(2, "0")}${s}` : `${d}${s}`;
}

function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function left(mins) {
    if (mins < 1) return "now";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

function group() {
    const g = Number(localStorage.getItem("linkcs-group"));
    return g === 2 ? 2 : 1;
}

// Entries for a given weekday, filtered to the chosen group.
function dayEntries(dow, g) {
    return (WEEK[dow] || [])
        .filter(([, , , , , grp]) => grp === 0 || grp === g)
        .map(([s, e, code, room, kind]) => ({
            s, e, code, room, kind, from: tmin(s), to: tmin(e),
        }))
        .sort((a, b) => a.from - b.from);
}

// The next teaching day with something on it, up to a week ahead.
function nextDayWithClass(after) {
    const g = group();
    for (let i = 1; i <= 8; i++) {
        const d = new Date(after);
        d.setDate(d.getDate() + i);
        if (ymd(d) > TERM.end) return null;
        if (NO_CLASS[ymd(d)]) continue;
        const list = dayEntries(d.getDay(), g).filter((x) => x.kind !== "free");
        if (list.length) return { date: d, list };
    }
    return null;
}

function label(x) {
    const c = COURSES[x.code];
    const suffix = x.kind === "lab" ? " lab" : x.kind === "tut" ? " tutorial" : "";
    return { code: x.code, name: (c ? c.name : x.code) + suffix, prof: c ? c.prof : "" };
}

// ---------- render ----------

function renderTimetable() {
    const box = document.getElementById("tt-body");
    if (!box) return;

    const now = new Date();
    const today = ymd(now);
    const mins = now.getHours() * 60 + now.getMinutes();
    const g = group();

    const chip = (txt) => `<span class="tt-chip">${txt}</span>`;

    // outside the teaching term
    if (today < TERM.start) {
        box.innerHTML = `<p class="tt-quiet">Classes start ${TERM.start.split("-").reverse().join("/")}.</p>`;
        return;
    }
    if (today > TERM.end) {
        box.innerHTML = `<p class="tt-quiet">Semester's over. Have a good break.</p>`;
        return;
    }

    const off = NO_CLASS[today];
    const list = off ? [] : dayEntries(now.getDay(), g).filter((x) => x.kind !== "free");

    const current = list.find((x) => mins >= x.from && mins < x.to);
    const upcoming = list.find((x) => x.from > mins);

    let html = "";

    if (current) {
        const L = label(current);
        html += `
        <div class="tt-slot tt-on">
            <span class="tt-when">now · ends ${t12(current.e)}</span>
            <span class="tt-course">${L.code} <em>${L.name}</em></span>
            <span class="tt-meta">${chip(current.room)} ${left(current.to - mins)} left</span>
        </div>`;
    }

    if (upcoming) {
        const L = label(upcoming);
        html += `
        <div class="tt-slot">
            <span class="tt-when">${current ? "then" : "next"} · ${t12(upcoming.s)}</span>
            <span class="tt-course">${L.code} <em>${L.name}</em></span>
            <span class="tt-meta">${chip(upcoming.room)} in ${left(upcoming.from - mins)}</span>
        </div>`;
    }

    if (!current && !upcoming) {
        const nd = nextDayWithClass(now);
        const why = off ? off
            : list.length ? "Done for today"
                : (now.getDay() === 0 || now.getDay() === 6) ? "Weekend" : "Nothing scheduled";
        html += `<div class="tt-slot tt-none"><span class="tt-when">${why}</span>`;
        if (nd) {
            const L = label(nd.list[0]);
            const dn = ymd(nd.date) === ymd(new Date(now.getTime() + 864e5))
                ? "tomorrow" : DAY_NAME[nd.date.getDay()];
            html += `<span class="tt-course">${L.code} <em>${L.name}</em></span>
                     <span class="tt-meta">${chip(nd.list[0].room)} ${dn} ${t12(nd.list[0].s)}</span>`;
        }
        html += `</div>`;
    }

    box.innerHTML = html;

    const gb = document.getElementById("tt-group");
    if (gb) gb.textContent = "G" + g;
}

// ---------- wiring ----------

function initTimetable() {
    const gb = document.getElementById("tt-group");
    if (gb) {
        gb.addEventListener("click", () => {
            localStorage.setItem("linkcs-group", group() === 1 ? "2" : "1");
            renderTimetable();
        });
    }
    renderTimetable();

    // Same contract as the bus page: cheap tick, and a forced re-render
    // whenever the page comes back in front of a human, because phones
    // freeze timers on a backgrounded tab.
    let lastMin = null;
    setInterval(() => {
        const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
        if (m === lastMin) return;
        lastMin = m;
        renderTimetable();
    }, 1000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) renderTimetable();
    });
    window.addEventListener("pageshow", () => renderTimetable());
    window.addEventListener("focus", () => renderTimetable());
}

initTimetable();
