// ============================================================
// SEM 5 TIMETABLE — current + next class on the home page.
//
// Transcribed from the official PDF (iitdabudhabi.ac.ae/timetable ->
// "Year 3 Semester 5 B.TECH Computer Science and Engineering"), read
// off the rendered grid rather than the text layer, then cross-checked
// against every course's L-T-P-C credits — lecture, tutorial and lab
// hours all reconcile, which is what says the block spans are right.
//
// Both groups are shown together. Only three entries in the week are
// group-specific (all HUL tutorials); those carry a G1/G2 badge and
// everything else applies to everyone.
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
//   group: 0 everyone · 1 group 1 only · 2 group 2 only
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

// Room codes -> what people actually call the room. Only four rooms
// appear in the whole Sem 5 timetable, so this is an explicit table
// rather than a rule — the codes do not decode arithmetically.
//
// M4-1-017 = "classroom 7" is Evan's, confirmed off the door. The other
// three are the code's last group with the leading zero dropped and are
// NOT confirmed — if a door disagrees, fix it here, one line.
const ROOMS = {
    "M4-1-017": { bldg: "M4", floor: "1st floor", no: "7" },
    "M4-0-011": { bldg: "M4", floor: "ground floor", no: "11" },
    "M3-0-022": { bldg: "M3", floor: "ground floor", no: "22" },
    "M4.0.019": { bldg: "M4", floor: "ground floor", no: "19" },
};

function whereIs(code) {
    const r = ROOMS[code];
    if (r) return { raw: code, no: r.no, sub: `${r.bldg} · ${r.floor}` };
    const m = String(code || "").match(/^([A-Za-z]\d+)[.\-](\d)[.\-](\d+)$/);
    if (!m) return { raw: code || "", no: code || "?", sub: "" };
    return { raw: code, no: String(Number(m[3])), sub: `${m[1].toUpperCase()} · floor ${m[2]}` };
}

function left(mins) {
    if (mins < 1) return "now";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

// Everything on a given weekday — both groups, in time order.
function dayEntries(dow) {
    return (WEEK[dow] || [])
        .map(([s, e, code, room, kind, grp]) => ({
            s, e, code, room, kind, grp, from: tmin(s), to: tmin(e),
        }))
        .sort((a, b) => a.from - b.from || a.grp - b.grp);
}

// The next teaching day with something on it, up to a week ahead.
function nextDayWithClass(after) {
    for (let i = 1; i <= 8; i++) {
        const d = new Date(after);
        d.setDate(d.getDate() + i);
        if (ymd(d) > TERM.end) return null;
        if (NO_CLASS[ymd(d)]) continue;
        const list = dayEntries(d.getDay()).filter((x) => x.kind !== "free");
        if (list.length) return { date: d, list };
    }
    return null;
}

const KIND = { lab: "Lab", tut: "Tutorial", "": "Lecture" };

function label(x) {
    const c = COURSES[x.code];
    return { code: x.code, name: c ? c.name : x.code, kind: KIND[x.kind] || "Lecture" };
}

// ---------- render ----------

function renderTimetable() {
    const box = document.getElementById("tt-body");
    if (!box) return;

    const now = new Date();
    const today = ymd(now);
    const mins = now.getHours() * 60 + now.getMinutes();

    // Left is what and when; right is the big room number, because that
    // is the bit you are actually looking for while walking there.
    const slot = (tag, x, timeText, on) => {
        const L = label(x);
        const w = whereIs(x.room);
        return `
        <div class="tt-slot${on ? " tt-on" : ""}">
            <div class="tt-main">
                <span class="tt-tag">${tag}<b class="tt-kind tt-k-${x.kind || "lec"}">${L.kind}</b>${x.grp ? `<b class="tt-g">G${x.grp}</b>` : ""}</span>
                <span class="tt-code">${L.code}<em>${L.name}</em></span>
                <span class="tt-time">${timeText}</span>
            </div>
            <div class="tt-room" title="${w.raw}">
                <span class="tt-room-lab">${L.kind === "Lab" ? "lab" : "classroom"}</span>
                <span class="tt-room-no">${w.no}</span>
                <span class="tt-room-sub">${w.sub}</span>
            </div>
        </div>`;
    };

    if (today < TERM.start) {
        box.innerHTML = `<p class="tt-quiet">Classes start ${TERM.start.split("-").reverse().join("/")}.</p>`;
        return;
    }
    if (today > TERM.end) {
        box.innerHTML = `<p class="tt-quiet">Semester's over. Have a good break.</p>`;
        return;
    }

    const off = NO_CLASS[today];
    const list = off ? [] : dayEntries(now.getDay()).filter((x) => x.kind !== "free");

    // Both groups are on screen, so more than one thing can be running
    // or starting next — G1 and G2 diverge on three tutorials a week.
    const current = list.filter((x) => mins >= x.from && mins < x.to);
    const later = list.filter((x) => x.from > mins);
    const nextAt = later.length ? Math.min(...later.map((x) => x.from)) : null;
    const upcoming = nextAt === null ? [] : later.filter((x) => x.from === nextAt);

    let html = "";

    for (const x of current) {
        html += slot("now", x, `ends ${t12(x.e)} · ${left(x.to - mins)} left`, true);
    }
    for (const x of upcoming) {
        html += slot(current.length ? "then" : "next", x,
            `${t12(x.s)} · in ${left(x.from - mins)}`, false);
    }

    if (!current.length && !upcoming.length) {
        const nd = nextDayWithClass(now);
        const why = off ? off
            : list.length ? "Done for today"
                : (now.getDay() === 0 || now.getDay() === 6) ? "Weekend" : "Nothing scheduled";
        if (nd) {
            const first = nd.list[0].from;
            const dn = ymd(nd.date) === ymd(new Date(now.getTime() + 864e5))
                ? "tomorrow" : DAY_NAME[nd.date.getDay()];
            for (const x of nd.list.filter((y) => y.from === first)) {
                html += slot(why, x, `${dn} · ${t12(x.s)}`, false);
            }
        } else {
            html += `<p class="tt-quiet">${why}.</p>`;
        }
    }

    box.innerHTML = html;
}

// ---------- wiring ----------

// Same contract as the bus page: cheap tick, and a forced re-render
// whenever the page comes back in front of a human, because phones
// freeze timers on a backgrounded tab.
renderTimetable();

let ttLastMin = null;
setInterval(() => {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m === ttLastMin) return;
    ttLastMin = m;
    renderTimetable();
}, 1000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderTimetable();
});
window.addEventListener("pageshow", () => renderTimetable());
window.addEventListener("focus", () => renderTimetable());
