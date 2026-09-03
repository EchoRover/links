// ============================================================
// WEEK GRID — the Sem 5 timetable as an actual calendar week.
//
// Zero new data. Everything is rendered from js/timetable.js: WEEK,
// COURSES, ROOMS, whereIs(), t12(), TERM, NO_CLASS. That transcription is
// the one mechanically reconciled against the sheet's L-T-P-C table
// (tools/check_timetable.py), so this page must never hold a second copy
// of the times. A block wrong here is wrong in timetable.js.
//
// Layout: days across, time down, blocks absolutely positioned by real
// start/end minutes -- a 14:00-15:20 class draws 80 minutes tall, because
// seeing the 20 minutes is the whole reason to draw a grid instead of a list.
//
// Colour carries COURSE IDENTITY and nothing else: same course, same hue,
// every block, all week. Kind (lecture/lab/tutorial) is a word, not a hue --
// seven courses already spend the distinguishable range, and stacking a
// second meaning on it makes both unreadable.
// ============================================================

const DAYS = [1, 2, 3, 4, 5];
const DAY_LABEL = ["", "MON", "TUE", "WED", "THU", "FRI"];
const DAY_FULL = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MONTH = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

// Week on a phone is a lie: five columns in 390px truncates every block to
// "Operating" and "Entrepreneursh". The phone opens on ONE day at full
// width; the week stays behind the toggle. Chosen once from the viewport,
// after which the toggle wins, so rotating does not discard a picked view.
let VIEW = window.matchMedia("(max-width: 760px)").matches ? "day" : "week";
let CENTERED = null;   // guard so auto-centring never fights a manual scroll
let CURSOR = new Date();   // any date inside the week being shown

// A 50-min lecture is the tightest block in the week and it must still fit
// strip + name + room; 1.15 clipped the room line. The phone runs taller
// still, because the day view sets larger type and scrolls vertically anyway.
// The reference runs about 2 px/min: content sits at the TOP of a block and
// the rest of its duration stays as open tinted space beneath. That space is
// the design, not waste -- it is what makes duration readable at a glance.
// Affordable here only because the empty stretches collapse (see SEGS).
const PX_PER_MIN = window.matchMedia("(max-width: 760px)").matches ? 2.1 : 1.8;
const PAD_TOP = 14;        // room for the first hour label, centred on its line

// The drawn window spans only the teaching day that exists, derived rather
// than hardcoded so a 7am block on a future revision cannot render off-screen.
const BOUNDS = (() => {
    let lo = 24 * 60, hi = 0;
    for (const d of DAYS) for (const [s, e] of (WEEK[d] || [])) {
        lo = Math.min(lo, tmin(s)); hi = Math.max(hi, tmin(e));
    }
    return { lo: Math.floor(lo / 60) * 60, hi: Math.ceil(hi / 60) * 60 };
})();
// ---- vertical scale -------------------------------------------------------
// A linear day wastes a third of the screen on the midday hole: 12:00-14:00
// is empty every single day, and you scroll past it to reach the afternoon.
// So the axis is piecewise. Time with classes in it runs at PX_PER_MIN; any
// stretch longer than GAP_MIN with nothing in it, on any shown day, collapses
// to a fixed GAP_PX band that says how long it is. The grid stays honest --
// the band is labelled and visibly different, never silently squeezed.
const GAP_MIN = 45;
const GAP_PX = 28;

// A block only needs enough height to hold its content; past that, extra
// duration is just tinted air. So time is drawn at full rate for the first
// CAP_MIN of any stretch and at SLOW rate after -- an 80-minute lecture stops
// costing twice a 40-minute one. The compression is applied BETWEEN block
// boundaries, never across one, so nothing shifts out of alignment and no
// short block is squeezed: only the interior of a long one gives way.
// CAP_MIN must be >= the SHORTEST block in the week (50 min here), or short
// blocks get only their content height and read as having no padding while
// longer ones keep theirs. That asymmetry is a bug, not a style.
const CAP_MIN = 50;
const SLOW = 0.3;
let SEGS = [];      // [{from, to, gap}] covering BOUNDS, rebuilt per render

function buildSegs(days) {
    const busy = [];
    for (const d of days) {
        for (const x of dayEntries(d).filter((y) => y.kind !== "free")) busy.push([x.from, x.to]);
    }
    busy.sort((a, b) => a[0] - b[0]);

    const merged = [];
    for (const [s, e] of busy) {
        const last = merged[merged.length - 1];
        if (last && s <= last[1]) last[1] = Math.max(last[1], e);
        else merged.push([s, e]);
    }

    // Every start and end in view is a boundary; a segment never spans one.
    const marks = new Set();
    for (const d of days) {
        for (const x of dayEntries(d).filter((y) => y.kind !== "free")) { marks.add(x.from); marks.add(x.to); }
    }

    const segs = [];
    let cur = BOUNDS.lo;
    for (const [s, e] of merged) {
        if (s > cur) segs.push({ from: cur, to: s, gap: s - cur > GAP_MIN });
        const inner = [...marks].filter((m) => m > Math.max(cur, s) && m < e).sort((a, b) => a - b);
        let p = Math.max(cur, s);
        for (const m of [...inner, e]) { segs.push({ from: p, to: m, gap: false }); p = m; }
        cur = Math.max(cur, e);
    }
    // A trailing empty stretch is not information -- the day is over. Keep it
    // only when it is short enough to read as the tail of the last class.
    if (cur < BOUNDS.hi && BOUNDS.hi - cur <= GAP_MIN) segs.push({ from: cur, to: BOUNDS.hi, gap: false });
    return segs;
}

function segPx(s) {
    const len = s.to - s.from;
    if (s.gap) return GAP_PX;
    return Math.min(len, CAP_MIN) * PX_PER_MIN
        + Math.max(0, len - CAP_MIN) * PX_PER_MIN * SLOW;
}

function yOf(m) {
    let y = PAD_TOP;
    for (const s of SEGS) {
        if (m <= s.from) return y;
        const len = s.to - s.from;
        const frac = (Math.min(m, s.to) - s.from) / len;
        y += segPx(s) * frac;
        if (m <= s.to) return y;
    }
    return y;
}
// The drawn day ends where the segments do, which in day view is the last
// class rather than the week's latest hour.
const gridEnd = () => (SEGS.length ? SEGS[SEGS.length - 1].to : BOUNDS.hi);
const gridHeight = () => yOf(gridEnd()) + 12;

function humanSpan(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// Stable colour per course: index in declaration order, so the mapping does
// not reshuffle when a block moves to another day.
const COURSE_IX = Object.fromEntries(Object.keys(COURSES).map((c, i) => [c, i]));
const KIND_WORD = { lab: "Lab", tut: "Tutorial", proj: "Project", "": "Lecture" };

// Monday of whatever week `d` falls in.
function mondayOf(d) {
    const x = new Date(d);
    const off = (x.getDay() + 6) % 7;          // Sun=0 -> 6, Mon=1 -> 0
    x.setDate(x.getDate() - off);
    x.setHours(0, 0, 0, 0);
    return x;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// What to call the place. Prefers the name people say out loud
// ("Computer Lab 03", "Classroom 7"); falls back to the bare code when the
// room is not in ROOMS. whereIs() already refuses to guess a name, and that
// refusal is the behaviour worth keeping, so it passes straight through.
function placeName(code) {
    const w = whereIs(code);
    if (w.none) return { name: "Room not listed", code: "", soft: true };
    if (!w.ok) return { name: w.raw, code: "", soft: true };
    return { name: w.lab ? `Computer Lab ${w.no}` : `Classroom ${w.no}`, code: w.raw, soft: false };
}

// Blocks overlapping in time on the same day sit side by side, never
// stacked. Only the G1/G2 tutorials collide today, but a future sheet could
// add more and a hidden class is far worse than a narrow one.
function lay(list) {
    const out = list.map((x) => ({ ...x, col: 0, cols: 1 }));
    for (const a of out) {
        const clash = out.filter((b) => b.from < a.to && b.to > a.from);
        a.cols = clash.length;
        a.col = clash.indexOf(a);
    }
    return out;
}

function renderWeek() {
    const grid = document.getElementById("wk-grid");
    if (!grid) return;

    const now = new Date();
    const todayKey = ymd(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const mon = mondayOf(CURSOR);

    // Day view shows the cursor's own weekday; weekends have no classes, so
    // landing on Saturday would open an empty grid -- fall forward to Monday.
    const cd = CURSOR.getDay();
    const dayIx = (cd >= 1 && cd <= 5) ? cd : 1;
    const shown = VIEW === "week" ? DAYS : [dayIx];
    SEGS = buildSegs(shown);

    // ---- hour rail ----
    // Hours inside a collapsed band are not drawn: three labels stacked in
    // 34px is noise, and the band already says how long it is.
    // Also drop an hour that lands ON a band edge: the label is centred on its
    // line, so it would sit half inside the band and read as clipped.
    const inGap = (m) => SEGS.some((s) => s.gap &&
        ((m > s.from && m < s.to) || Math.abs(yOf(m) - yOf(s.from)) < 11 || Math.abs(yOf(m) - yOf(s.to)) < 11));
    let rail = "", lines = "";
    for (let m = BOUNDS.lo; m <= gridEnd(); m += 60) {
        if (inGap(m)) continue;
        const h = Math.floor(m / 60);
        rail += `<div class="wk-hour" style="top:${yOf(m)}px">
            <span>${(h % 12) || 12} ${h < 12 ? "AM" : "PM"}</span></div>`;
        // One rule per hour, spanning the whole grid including the rail, the
        // way the reference draws them -- per-column backgrounds broke the
        // line at every divider and the eye could not follow a time across.
        lines += `<div class="wk-line" style="top:${yOf(m)}px"></div>`;
    }

    // The collapsed stretches, drawn once across the whole grid.
    const bands = SEGS.filter((s) => s.gap).map((s) => `
        <div class="wk-gap" style="top:${yOf(s.from)}px;height:${yOf(s.to) - yOf(s.from)}px">
            <span>${humanSpan(s.to - s.from)} free</span>
        </div>`).join("");

    // ---- columns ----
    let cols = "", heads = "";
    for (const d of shown) {
        const date = addDays(mon, d - 1);
        const key = ymd(date);
        const isToday = key === todayKey;
        const off = NO_CLASS[key];
        const inTerm = key >= TERM.start && key <= TERM.end;

        heads += `<div class="wk-head-day${isToday ? " on" : ""}">
            <span class="wk-hd-name">${VIEW === "day" ? DAY_FULL[d] : DAY_LABEL[d]}</span>
            <span class="wk-hd-num">${date.getDate()}</span>
        </div>`;

        const items = (off || !inTerm) ? [] : lay(dayEntries(d).filter((x) => x.kind !== "free"));

        let blocks = "";
        for (const x of items) {
            const c = COURSES[x.code];
            const p = placeName(x.room);
            const live = isToday && nowMins >= x.from && nowMins < x.to;
            const w = 100 / x.cols;
            // Two-tone: a solid time strip on top, lighter body under it. The
            // strip is what makes a wall of blocks scannable by START TIME,
            // which is the thing you actually look for.
            blocks += `
            <div class="wk-block c${COURSE_IX[x.code]}${live ? " wk-live" : ""}"
                 style="top:${yOf(x.from)}px;height:${yOf(x.to) - yOf(x.from)}px;
                        left:${x.col * w}%;width:calc(${w}% - 12px)">
                <div class="wk-strip">${t12(x.s)} – ${t12(x.e)}</div>
                <div class="wk-body-in">
                    <span class="wk-name">${c ? c.name : x.code}</span>
                    <span class="wk-meta">
                        <span class="wk-place${p.soft ? " wk-soft" : ""}">${p.name}</span>
                        <b class="wk-kind">${KIND_WORD[x.kind] || "Lecture"}</b>${x.grp ? `<b class="wk-grp">G${x.grp}</b>` : ""}
                    </span>
                </div>
            </div>`;
        }

        // A day off is said, not left blank -- an empty column reads as a bug.
        if (off) blocks += `<div class="wk-off"><span>${off}</span></div>`;

        // The now-line exists only on the real current day and only inside the
        // drawn window; pinned to the top edge at 6am it would read as a class.
        const showNow = isToday && nowMins >= BOUNDS.lo && nowMins <= gridEnd();
        const nowLine = showNow ? `<div class="wk-now" style="top:${yOf(nowMins)}px"><i></i></div>` : "";

        cols += `<div class="wk-col${isToday ? " wk-today" : ""}${off ? " wk-isoff" : ""}">${blocks}${nowLine}</div>`;
    }

    // The now-time pill rides the rail, level with the line.
    const nowVisible = shown.some((d) => ymd(addDays(mon, d - 1)) === todayKey)
        && nowMins >= BOUNDS.lo && nowMins <= gridEnd();
    const railNowLine = nowVisible
        ? `<div class="wk-nowfull" style="top:${yOf(nowMins)}px"></div>` : "";

    const railNow = shown.some((d) => ymd(addDays(mon, d - 1)) === todayKey)
        && nowMins >= BOUNDS.lo && nowMins <= gridEnd()
        ? `<div class="wk-nowpill" style="top:${yOf(nowMins)}px">${t12(
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)}</div>`
        : "";

    const tpl = `62px repeat(${shown.length}, 1fr)`;
    grid.className = VIEW === "day" ? "wk-dayview" : "";
    grid.innerHTML = `
        <div class="wk-head" style="grid-template-columns:${tpl}">
            <div class="wk-arrows">
                <button data-step="-1" aria-label="Previous">←</button>
                <button data-step="1" aria-label="Next">→</button>
            </div>
            ${heads}
        </div>
        <div class="wk-body" style="grid-template-columns:${tpl};height:${gridHeight()}px">
            <div class="wk-rail">${rail}${railNow}</div>
            ${cols}
            ${bands}
            ${lines}
            ${railNowLine}
        </div>`;

    // ---- toolbar ----
    const bar = document.getElementById("wk-bar");
    if (bar) {
        const a = mon, b = addDays(mon, 4);
        const range = a.getMonth() === b.getMonth()
            ? `${a.getDate()} – ${b.getDate()} ${MONTH[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`
            : `${a.getDate()} ${MONTH[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTH[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
        bar.innerHTML = `
            <div class="wk-bar-l">
                <h2 class="wk-month">${MONTH[CURSOR.getMonth()]} ${CURSOR.getFullYear()}</h2>
                <button class="wk-today-btn" data-today>Today</button>
            </div>
            <div class="wk-bar-r">
                <div class="wk-seg">
                    <button data-v="day" class="${VIEW === "day" ? "on" : ""}">Day</button>
                    <button data-v="week" class="${VIEW === "week" ? "on" : ""}">Week</button>
                </div>
                <span class="wk-range">${VIEW === "day"
                    ? `${DAY_FULL[dayIx]} ${addDays(mon, dayIx - 1).getDate()} ${MONTH[addDays(mon, dayIx - 1).getMonth()].slice(0, 3)}`
                    : range}</span>
            </div>`;
    }

    const leg = document.getElementById("wk-legend");
    if (leg) leg.innerHTML = Object.entries(COURSES).map(([code, c]) =>
        `<span class="wk-chip c${COURSE_IX[code]}"><b>${code}</b> ${c.name}</span>`).join("");

    // On a narrow screen the week overflows sideways, and it opens on Monday
    // with today possibly off-screen. Centre today's column once per
    // view/week change -- never on the minute tick, which would yank the grid
    // back while someone is scrolling it.
    const scroller = grid.parentElement;
    const stamp = `${VIEW}|${ymd(mon)}|${dayIx}`;
    if (scroller && CENTERED !== stamp) {
        CENTERED = stamp;
        // Match on the DATE, not the weekday: the grid can be showing a week
        // that is not this one, where no column is today.
        const ix = shown.findIndex((d) => ymd(addDays(mon, d - 1)) === todayKey);
        if (ix >= 0 && scroller.scrollWidth > scroller.clientWidth) {
            const colW = (scroller.scrollWidth - 62) / shown.length;
            const target = 62 + ix * colW + colW / 2 - scroller.clientWidth / 2;
            scroller.scrollLeft = Math.max(0, target);
        }
    }

    const note = document.getElementById("wk-note");
    if (note) {
        const k = ymd(CURSOR);
        note.textContent = k < TERM.start ? "Term hasn't started yet."
            : k > TERM.end ? "Semester's over." : "";
    }
}

// Delegated once on containers that survive every re-render, so handlers are
// not rebound on each tick.
function onClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v) VIEW = b.dataset.v;
    else if (b.dataset.step) CURSOR = addDays(CURSOR, Number(b.dataset.step) * (VIEW === "day" ? 1 : 7));
    else if ("today" in b.dataset) CURSOR = new Date();
    renderWeek();
}
document.getElementById("wk-bar")?.addEventListener("click", onClick);
document.getElementById("wk-grid")?.addEventListener("click", onClick);

renderWeek();

// Only the now-line and the live highlight move, both minute-resolution.
let wkLast = null;
setInterval(() => {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m === wkLast) return;
    wkLast = m; renderWeek();
}, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderWeek(); });
window.addEventListener("pageshow", () => renderWeek());

// Theme toggle — scripts.js isn't loaded on sub-pages, so wire it here
// (same pattern as the bus and rooms pages). Re-render after, because the
// grid's colours are read from CSS variables at paint, not at build.
document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
});
