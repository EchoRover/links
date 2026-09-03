// ============================================================
// SEM 5 TIMETABLE — current + next class on the home page.
//
// Transcribed from the official PDF (iitdabudhabi.ac.ae/timetable ->
// "Year 3 Semester 5 B.TECH Computer Science and Engineering"; every
// sheet is kept in data/timetables/, named by REVISION date), read
// off the rendered grid rather than the text layer, then cross-checked
// against every course's L-T-P-C credits — lecture, tutorial and lab
// hours all reconcile, which is what says the block spans are right.
//
// Checked mechanically, not by eye: `python3 tools/check_timetable.py`
// reconciles every block below against the L-T-P-C table the sheet prints,
// which is the half of the document this file does NOT transcribe.
//
// REVISION 3: the 27 August 2026 reissue (stamped "27th August 2026 -
// 5:30pm" in the sheet's own footer).
//   - All computer labs (ACOL331, ACOL333) moved from M3-0-022 to M3-0-004 (Computer Lab 03).
//   - ACOD310 (Mini Project) moved from Thursday 9-10 to Friday 10:00-11:50 in M4-1-017.
//   - The eleven sheets the college circulated on 29 August are this same
//     revision re-sent, NOT a fourth one: every one of them carries the 27
//     August stamp, and a cell-by-cell recheck of the Sem 5 sheet on
//     2026-09-01 found nothing to change. The date in a filename is when it
//     was mailed; the date in the footer is the revision. Trust the footer.
//
// REVISION 2: the 23 August 2026 reissue. It differs from the launch
// version in four ways, all of them taken from the new grid:
//   - every block now prints its own start/end time, and they are NOT
//     round hours. A "10:00 - 10:50" lecture ends at :50, a 90-minute
//     HUL slot is 14:00 - 15:20, AGRL130 runs 16:00 - 18:50. The old
//     transcription rounded these to the column edges and was wrong by
//     up to 20 minutes on the countdown.
//   - the grid now names the rooms, so M3-0-022 and M4-0-019 are no
//     longer guesses (see ROOMS). M4.0.019 was also respelled M4-0-019.
//   - ACOD310 (Mini Project, 0-0-6-3) is new, and Thursday 9-10 is
//     reserved for it.
//   - the old "reserved for additional classes" blocks on Monday and
//     Friday morning are gone; the sheet now says that generically in
//     a footnote instead of holding named slots.
//
// Both groups are shown together. Only four entries in the week are
// group-specific (all HUL tutorials — one Tuesday, three Wednesday);
// those carry a G1/G2 badge and everything else applies to everyone.
// The launch version of this comment said three and was miscounting.
// ============================================================

const COURSES = {
    ACOL331: { name: "Operating Systems", prof: "Abhilash Jindal" },
    ACOL333: { name: "Principles of AI", prof: "Sumeet Agarwal" },
    ACOL351: { name: "Algorithms", prof: "Nikhil Balaji C R" },
    ACOD310: { name: "Mini Project", prof: "Kaushal Kumar Maurya · Alap Kshirsagar" },
    AGRL130: { name: "Entrepreneurship", prof: "Joby Joseph · Ashu Verma" },
    AHUL256: { name: "Critical Thinking", prof: "Arjun Ghosh" },
    AHUL261: { name: "Psychology", prof: "Yashpal Jogdand" },
};

// [start, end, code, room, kind, group]
//   kind:  "" lecture · "tut" tutorial · "lab" lab · "proj" project hold
//   group: 0 everyone · 1 group 1 only · 2 group 2 only
//
// Times are the ones printed inside each block on the 23 Aug grid, not
// the column headings above it. Those are different numbers and the
// countdown is only honest if it uses the printed ones.
const WEEK = {
    1: [ // Monday
        ["10:00", "10:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["16:00", "18:50", "AGRL130", "M4-0-011", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "10:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "16:20", "AHUL256", "M4-1-017", "tut", 2],
        // The AI lab. The sheet does NOT print "Lab" on this block the
        // way it does on ACOL331's, but ACOL333 is 3-0-2-4 and this is
        // its only practical block: 110 min in M3-Computer Lab 03 is
        // exactly the 2 P-hours, and without it the credits do not
        // reconcile. Tagged from the credits, not from the caption.
        ["16:30", "18:20", "ACOL333", "M3-0-004", "lab", 0],
    ],
    3: [ // Wednesday
        ["08:00", "09:50", "ACOL331", "M3-0-004", "lab", 0],
        ["10:00", "10:50", "ACOL351", "M4-0-019", "tut", 0],
        ["11:00", "11:50", "AHUL261", "M4-1-017", "tut", 2],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["15:30", "16:20", "AHUL261", "M4-1-017", "tut", 1],
        ["17:00", "17:50", "AHUL256", "M4-1-017", "tut", 1],
    ],
    4: [ // Thursday
        ["08:00", "08:50", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "10:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "17:20", "ACOL331", "M3-0-004", "lab", 0],
    ],
    5: [ // Friday
        ["09:00", "09:50", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "11:50", "ACOD310", "M4-1-017", "proj", 0],
    ],
};

// From AcademicCalendar-2026-27Sem1.pdf. Showing a class on a day it
// cannot happen is worse than showing nothing, so the term bounds and
// the no-class days are encoded rather than assumed.
const TERM = { start: "2026-08-20", end: "2026-12-16" };
const NO_CLASS = {
    // The calendar printed 26/08 with a star ("government may move it").
    // It moved: Evan confirmed 2026-08-24 that the holiday is Friday 28th.
    "2026-08-28": "Prophet's Birthday",
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

// Room codes -> what people actually call the room.
//
// These do NOT decode arithmetically and it is not close: M4-1-017 is
// "classroom 7" and M4-0-011 is "classroom 3". No string rule produces
// both. So this is a lookup, and anything not in it is NOT guessed —
// an unconfirmed room shows its raw code under a "room code" label
// instead of a friendly number that might send you to the wrong door.
//
// As of the 23 Aug grid all four are named on the sheet itself, so
// nothing here is inferred any more. The two labs are called "Computer
// Lab 02", not a classroom number, so they carry their own label.
const ROOMS = {
    "M4-1-017": { bldg: "M4", floor: "1F", no: "7", ok: true },
    "M4-0-011": { bldg: "M4", floor: "G", no: "3", ok: true },
    "M3-0-022": { bldg: "M3", floor: "G", no: "02", ok: true, lab: true },
    "M3-0-004": { bldg: "M3", floor: "G", no: "03", ok: true, lab: true },
    // M4-0-019 is the one room the paperwork cannot agree on: the Y3-CSE
    // sheet calls it Classroom 3 (Classroom 5 on the 23 Aug issue), the Y2
    // MTech-ETS sheet Classroom 4, and the M4 fire-evacuation board
    // Classroom 5. The code never changed, so a diff of courses, times and
    // codes read the 27 Aug revision as a no-op and shipped the wrong name.
    //
    // WE PRINT WHAT THE DOOR SAYS. The physical sign is Classroom 5, and a
    // room plate exists to get Evan to the right door, not to match a PDF.
    // check_timetable.py still reads every label off the sheet; this one
    // room is a declared override there (DOOR_SIGN) so the disagreement
    // stays visible instead of being quietly absorbed.
    "M4-0-019": { bldg: "M4", floor: "G", no: "5", ok: true },
    "M4.0.019": { bldg: "M4", floor: "G", no: "5", ok: true },  // spelling used on the earlier sheet
};

// Two room codes can carry the same printed name (see M4-0-011 vs
// M4-0-019). When that happens the plate alone is ambiguous, so the code
// goes into the subtitle. Derived from ROOMS rather than hardcoded, so it
// keeps working when the sheet changes again.
const NAME_COLLIDES = (() => {
    const seen = {};
    for (const [code, r] of Object.entries(ROOMS)) {
        const key = `${r.bldg}|${r.no}`;
        (seen[key] ||= new Set()).add(code.replace(/\./g, "-"));
    }
    return new Set(
        Object.entries(seen)
            .filter(([, codes]) => codes.size > 1)
            .flatMap(([, codes]) => [...codes])
    );
})();

function whereIs(code) {
    // Some blocks carry no room at all (the ACOD310 hold). Say that
    // plainly rather than printing a bare "?" that reads like a bug.
    if (!code) return { raw: "", no: "—", sub: "not listed", ok: false, none: true };
    const r = ROOMS[code];
    if (r) {
        const norm = String(code).replace(/\./g, "-");
        const sub = NAME_COLLIDES.has(norm) ? norm : `${r.bldg} · ${r.floor}`;
        return { raw: code, no: r.no, sub, ok: !!r.ok, lab: !!r.lab };
    }
    const m = String(code).match(/^([A-Za-z]\d+)[.\-](\d)[.\-](\d+)$/);
    if (!m) return { raw: code, no: code, sub: "", ok: false };
    return { raw: code, no: m[3], sub: `${m[1].toUpperCase()} · ${m[2] === "0" ? "G" : m[2] + "F"}`, ok: false };
}

function left(mins) {
    if (mins < 1) return "now";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

// Same shape as the room plate: one big number plus a quiet unit, so
// the two plates read as a pair rather than two different ideas.
function countPlate(mins, verb) {
    if (mins < 60) return { lab: verb, no: String(Math.max(0, mins)), sub: "min" };
    const h = Math.floor(mins / 60), m = mins % 60;
    return { lab: verb, no: String(h), sub: m ? `h ${m}m` : (h === 1 ? "hour" : "hours") };
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

const KIND = { lab: "Lab", tut: "Tutorial", proj: "Reserved", "": "Lecture" };

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

    // Two plates of the same shape bracket the course: how long you
    // have on the left, which room on the right. Both are a single big
    // number because both are read at a glance, mid-walk.
    const plate = (kind, p) => `
        <div class="tt-plate tt-p-${kind}">
            <span class="tt-p-lab">${p.lab}</span>
            <span class="tt-p-no">${p.no}</span>
            <span class="tt-p-sub">${p.sub}</span>
        </div>`;

    // Reading order, left to right: what the class is, then where it is,
    // then how long you have. The two plates sit together on the right so
    // the pair still reads as a pair, with the countdown on the outside
    // edge where the eye lands last.
    const slot = (tagText, x, timePlate, on) => {
        const L = label(x);
        const w = whereIs(x.room);
        return `
        <div class="tt-slot${on ? " tt-on" : ""}">
            <div class="tt-main">
                <span class="tt-tag">${tagText}<b class="tt-kind tt-k-${x.kind || "lec"}">${L.kind}</b>${x.grp ? `<b class="tt-g">G${x.grp}</b>` : ""}</span>
                <span class="tt-code">${L.code}<em>${L.name}</em></span>
                <span class="tt-clock">${t12(x.s)} – ${t12(x.e)}</span>
            </div>
            ${plate("room" + (w.ok ? "" : " tt-p-raw"),
                { lab: w.none ? "room" : w.ok ? (w.lab ? "computer lab" : "classroom") : "room code",
                  no: w.no, sub: w.sub })}
            ${plate("time", timePlate)}
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
        html += slot("now", x, countPlate(x.to - mins, "ends in"), true);
    }
    for (const x of upcoming) {
        html += slot(current.length ? "then" : "next", x,
            countPlate(x.from - mins, "starts in"), false);
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
                const [hh, mm] = x.s.split(":");
                const h12 = (Number(hh) % 12) || 12;
                html += slot(why, x, {
                    lab: dn,
                    no: mm === "00" ? String(h12) : `${h12}:${mm}`,
                    sub: (Number(hh) < 12 ? "am" : "pm"),
                }, false);
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
