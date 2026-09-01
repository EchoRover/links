// ============================================================
// CAMPUS TOOLS — scheduling questions the timetable can answer
// but a timetable cannot show you.
//
//   1. FREE TIME  when is a chosen set of cohorts simultaneously free
//   2. ROOMS      which rooms are actually empty at a chosen time
//   3. FACULTY    one professor's week, assembled across programs
//
// Data: CT (data/campus-tools-data.js) = one flat list of class
// occurrences. Every view here is a DERIVED INDEX computed at load,
// never a second stored copy -- linkcs already carries rooms-data.js
// and timetable.js as two hand-kept versions of overlapping facts,
// and they can drift with nothing to catch it. Pivot at runtime.
// ============================================================

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_N = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

// the window the sheets actually cover
const DAY_START = 8 * 60;
const DAY_END = 19 * 60;

// Every sheet carries a Lunch column, so 12:50-14:00 comes back free on
// basically every day. That is true but it is not a finding -- it is the
// gap the timetable already leaves. Windows sitting inside this band get
// labelled rather than dropped: sometimes lunch IS when you want to meet.
const LUNCH = [12 * 60, 14 * 60];
const isLunch = (a, b) => a >= LUNCH[0] - 15 && b <= LUNCH[1] + 10;

const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hhmm = (v) => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
const t12 = (v) => {
    const h = Math.floor(v / 60), m = v % 60;
    const s = h < 12 ? "AM" : "PM";
    let d = h % 12; if (d === 0) d = 12;
    return `${d}:${String(m).padStart(2, "0")} ${s}`;
};

// ---------- interval algebra ----------
// merge overlapping [a,b) intervals
function merge(iv) {
    if (!iv.length) return [];
    const s = iv.slice().sort((x, y) => x[0] - y[0]);
    const out = [s[0].slice()];
    for (const [a, b] of s.slice(1)) {
        const last = out[out.length - 1];
        if (a <= last[1]) last[1] = Math.max(last[1], b);
        else out.push([a, b]);
    }
    return out;
}
// complement of busy within [lo,hi)
function invert(busy, lo, hi) {
    const out = []; let cur = lo;
    for (const [a, b] of merge(busy)) {
        if (a > cur) out.push([cur, Math.min(a, hi)]);
        cur = Math.max(cur, b);
        if (cur >= hi) break;
    }
    if (cur < hi) out.push([cur, hi]);
    return out.filter(([a, b]) => b > a);
}
// intersect two interval lists
function intersect(x, y) {
    const out = []; let i = 0, j = 0;
    while (i < x.length && j < y.length) {
        const a = Math.max(x[i][0], y[j][0]), b = Math.min(x[i][1], y[j][1]);
        if (b > a) out.push([a, b]);
        (x[i][1] < y[j][1]) ? i++ : j++;
    }
    return out;
}

// ---------- indexes, all derived ----------
const IX = { byCohort: {}, byRoom: {}, byFaculty: {}, cohorts: [], rooms: [], faculty: [] };

function buildIndexes() {
    for (const c of CT.classes) {
        const day = DAY_N[c.day]; if (!day) continue;
        const iv = [mins(c.start), mins(c.end)];

        const ck = c.cohort;
        (IX.byCohort[ck] = IX.byCohort[ck] || {});
        (IX.byCohort[ck][day] = IX.byCohort[ck][day] || []).push({ ...c, iv });

        if (c.room) {
            (IX.byRoom[c.room] = IX.byRoom[c.room] || {});
            (IX.byRoom[c.room][day] = IX.byRoom[c.room][day] || []).push({ ...c, iv });
        }
        for (const f of (CT.courses[c.course]?.faculty || [])) {
            (IX.byFaculty[f] = IX.byFaculty[f] || {});
            (IX.byFaculty[f][day] = IX.byFaculty[f][day] || []).push({ ...c, iv });
        }
    }
    IX.cohorts = Object.keys(IX.byCohort).sort();
    IX.rooms = Object.keys(IX.byRoom).sort();
    IX.faculty = Object.keys(IX.byFaculty).sort();
}

// free intervals for one cohort on one day
function freeFor(map, key, day) {
    const busy = (map[key]?.[day] || []).map((c) => c.iv);
    return invert(busy, DAY_START, DAY_END);
}

// common free time across many cohorts
function commonFree(keys, day) {
    if (!keys.length) return [];
    let acc = freeFor(IX.byCohort, keys[0], day);
    for (const k of keys.slice(1)) acc = intersect(acc, freeFor(IX.byCohort, k, day));
    return acc;
}

// ============================================================
// RENDERING - one timetable grid, three uses
// ============================================================
const $ = (s) => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };

let picked = new Set();

const PX_PER_MIN = 0.85;
const topOf = (m) => (m - DAY_START) * PX_PER_MIN;

function gridShell(container) {
    container.innerHTML = "";
    const H = (DAY_END - DAY_START) * PX_PER_MIN;

    container.appendChild(el("div", "tt-head", ""));
    for (const d of DAYS) container.appendChild(el("div", "tt-head", d.slice(0, 3)));

    const axis = el("div", "tt-axis");
    axis.style.height = H + "px";
    for (let h = 8; h <= 19; h++) {
        const lab = el("div", "tt-hour", `${h > 12 ? h - 12 : h}${h < 12 ? "a" : "p"}`);
        lab.style.top = topOf(h * 60) + "px";
        axis.appendChild(lab);
    }
    container.appendChild(axis);

    const cols = {};
    for (const d of DAYS) {
        const c = el("div", "tt-col");
        c.style.height = H + "px";
        for (let h = 8; h <= 19; h++) {
            const ln = el("div", "tt-line");
            ln.style.top = topOf(h * 60) + "px";
            c.appendChild(ln);
        }
        cols[d] = c;
        container.appendChild(c);
    }
    return cols;
}

function place(col, a, b, cls, html) {
    const n = el("div", cls, html);
    n.style.top = topOf(a) + "px";
    n.style.height = Math.max(13, (b - a) * PX_PER_MIN - 2) + "px";
    col.appendChild(n);
    return n;
}

const durLabel = (len) =>
    len >= 60 ? `${Math.floor(len / 60)}h${len % 60 ? " " + (len % 60) + "m" : ""}` : `${len}m`;

// cohort view: classes greyed out, the common free windows lit
function drawFree(container, keys, minLen) {
    const cols = gridShell(container);
    for (const d of DAYS) {
        const dn = DAY_N[d];
        // one block per class so each is clickable; overlapping cohorts sit
        // side by side rather than hiding each other
        const all = [];
        for (const k of keys) for (const c of (IX.byCohort[k]?.[dn] || [])) all.push(c);
        all.sort((x, y) => x.iv[0] - y.iv[0]);
        for (const c of all) {
            const node = place(cols[d], c.iv[0], c.iv[1], "tt-b " + (c.kind || ""),
                keys.length > 2 ? "" : `<b>${shortTitle(c.course) || c.course}</b>${c.room || ""}`);
            node.title = `${c.course} \u00b7 ${CT.courses[c.course]?.title || ""} \u00b7 ${CT.cohorts[c.cohort] || c.cohort}`;
            node.onclick = () => openClass(c);
        }

        for (const [a, b] of commonFree(keys, dn)) {
            const len = b - a;
            if (len < minLen) continue;
            const lunch = isLunch(a, b);
            place(cols[d], a, b, "tt-free" + (lunch ? " lunch" : ""),
                lunch ? `<b>lunch</b>` :
                    `<b>${t12(a)}</b>${len >= 45 ? `<span>${durLabel(len)}</span>` : ""}`);
        }
    }
}

// one room's or one professor's week
function shortTitle(code) {
    const t = CT.courses[code]?.title || "";
    return t.length > 30 ? t.slice(0, 29) + "\u2026" : t;
}

function drawClasses(container, perDay, sub) {
    const cols = gridShell(container);
    let n = 0;
    for (const d of DAYS) {
        for (const c of (perDay[DAY_N[d]] || []).sort((x, y) => x.iv[0] - y.iv[0])) {
            n++;
            const line2 = sub === "room" ? (CT.cohorts[c.cohort] || c.cohort)
                        : sub === "cohort" ? (c.room || "")
                        : `${c.room || ""}${c.cohort ? " \u00b7 " + (CT.cohorts[c.cohort] || c.cohort) : ""}`;
            const node = place(cols[d], c.iv[0], c.iv[1], "tt-b " + (c.kind || ""),
                `<b>${shortTitle(c.course) || c.course}</b>${line2}`);
            node.title = `${c.course} \u00b7 ${CT.courses[c.course]?.title || ""}`;
            node.onclick = () => openClass(c);
        }
    }
    return n;
}

// ============================================================
// DETAIL PANEL - the thing that makes this navigable instead of
// three dropdowns. A class names its course, the course names its
// faculty, a faculty name opens that person's week, a room code
// opens the room's. Every noun is a link.
// ============================================================
function showPanel(html) {
    $("#det-body").innerHTML = html;
    $("#det").classList.add("open");
    $("#det").setAttribute("aria-hidden", "false");
    for (const b of document.querySelectorAll("#det-body [data-go]")) {
        b.onclick = () => {
            const [what, val] = [b.dataset.go, b.dataset.val];
            if (what === "faculty") gotoFaculty(val);
            if (what === "room") gotoRoom(val);
            if (what === "course") openCourse(val);
        };
    }
}
function closePanel() {
    $("#det").classList.remove("open");
    $("#det").setAttribute("aria-hidden", "true");
}

function facultyLinks(code) {
    const f = CT.courses[code]?.faculty || [];
    if (!f.length) return '<span class="det-sub">not listed on the sheet</span>';
    return f.map((n) => `<button class="det-link" data-go="faculty" data-val="${n}">${n}</button>`).join("");
}

function openClass(c) {
    const meta = CT.courses[c.course] || {};
    showPanel(`
        <span class="det-kind">${c.kind || "lecture"}</span>
        <h2>${meta.title || c.course}</h2>
        <span class="det-code">${c.course}${meta.ltpc ? " \u00b7 " + meta.ltpc : ""}</span>
        <dl>
          <dt>When</dt><dd class="det-when">${c.day} ${t12(mins(c.start))} \u2013 ${t12(mins(c.end))}</dd>
          <dt>Room</dt><dd>${c.room
              ? `<button class="det-link" data-go="room" data-val="${c.room}">${c.room}${CT.rooms[c.room] ? " \u00b7 " + CT.rooms[c.room] : ""}</button>`
              : '<span class="det-sub">not printed</span>'}</dd>
          <dt>Who</dt><dd>${CT.cohorts[c.cohort] || c.cohort}${c.group && c.group !== "all" ? ` \u00b7 group ${c.group}` : ""}</dd>
          <dt>Taught by</dt><dd>${facultyLinks(c.course)}</dd>
          <dt>Course</dt><dd><button class="det-link" data-go="course" data-val="${c.course}">all ${c.course} classes</button></dd>
        </dl>`);
}

function openCourse(code) {
    const meta = CT.courses[code] || {};
    const all = CT.classes.filter((c) => c.course === code)
        .sort((a, b) => DAY_N[a.day] - DAY_N[b.day] || mins(a.start) - mins(b.start));
    showPanel(`
        <span class="det-kind">course</span>
        <h2>${meta.title || code}</h2>
        <span class="det-code">${code}${meta.ltpc ? " \u00b7 " + meta.ltpc : ""}</span>
        <dl>
          <dt>Taught by</dt><dd>${facultyLinks(code)}</dd>
          <dt>Meets</dt><dd>${all.map((c) =>
             `<div class="det-when">${c.day.slice(0,3)} ${t12(mins(c.start))} \u00b7 ` +
             `<button class="det-link" style="display:inline" data-go="room" data-val="${c.room}">${c.room || "?"}</button>` +
             ` <span class="det-sub">${CT.cohorts[c.cohort] || c.cohort}</span></div>`).join("") || "\u2014"}</dd>
        </dl>`);
}

function gotoFaculty(name) {
    if (!IX.byFaculty[name]) return;
    selectTab("faculty");
    $("#fac-pick").value = name;
    renderFaculty();
    closePanel();
}
function gotoRoom(code) {
    selectTab("rooms");
    drawClasses($("#room-week"), IX.byRoom[code] || {}, "room");
    $("#room-week-for").textContent = `${code}${CT.rooms[code] ? " \u00b7 " + CT.rooms[code] : ""}`;
    closePanel();
}
function selectTab(name) {
    for (const o of document.querySelectorAll(".ct-tab")) o.setAttribute("aria-selected", o.dataset.panel === name);
    for (const p of document.querySelectorAll(".ct-panel")) p.hidden = true;
    $("#panel-" + name).hidden = false;
}

function renderFree() {
    const minLen = +$("#minlen").value;
    const keys = [...picked];
    const box = $("#free-week");
    if (!keys.length) { box.innerHTML = '<p class="tt-empty">Pick at least one cohort above.</p>'; return; }
    drawFree(box, keys, minLen);
}

function renderCohortPicker() {
    const box = $("#cohort-pick"); box.innerHTML = "";
    for (const k of IX.cohorts) {
        const b = el("button", "chip", CT.cohorts[k] || k);
        b.setAttribute("aria-pressed", picked.has(k));
        b.onclick = () => {
            picked.has(k) ? picked.delete(k) : picked.add(k);
            b.setAttribute("aria-pressed", picked.has(k));
            renderFree();
        };
        box.appendChild(b);
    }
}

function renderRooms() {
    const day = +$("#room-day").value;
    const a = mins($("#room-from").value || "14:00");
    const b = mins($("#room-to").value || "16:00");
    const out = $("#room-out"); out.innerHTML = "";
    if (b <= a) { out.innerHTML = '<p class="ct-none">End time must be after the start.</p>'; return; }

    const free = [];
    for (const r of IX.rooms) {
        const clash = (IX.byRoom[r][day] || []).filter((c) => c.iv[0] < b && c.iv[1] > a);
        if (!clash.length) free.push(r);
    }
    out.appendChild(el("div", "ct-card",
        `<b>${free.length} free</b><span>of ${IX.rooms.length} rooms in the timetables</span>`));
    for (const r of free) {
        const card = el("div", "ct-card", `<b>${r}</b><span>${CT.rooms[r] || "—"}</span>`);
        card.style.cursor = "pointer";
        card.onclick = () => { gotoRoom(r); };
        out.appendChild(card);
    }
    if (free.length) {
        drawClasses($("#room-week"), IX.byRoom[free[0]] || {}, "room");
        $("#room-week-for").textContent = `${free[0]}${CT.rooms[free[0]] ? " \u00b7 " + CT.rooms[free[0]] : ""}`;
    }
}

function renderFaculty() {
    const f = $("#fac-pick").value;
    const n = drawClasses($("#fac-week"), IX.byFaculty[f] || {});
    $("#fac-count").textContent = n ? `${n} classes a week` : "no classes in these timetables";
}

// ---------- boot ----------
function init() {
    buildIndexes();

    for (const t of document.querySelectorAll(".ct-tab")) t.onclick = () => selectTab(t.dataset.panel);
    $("#det-x").onclick = closePanel;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

    renderCohortPicker();
    $("#minlen").onchange = renderFree;
    for (const b of document.querySelectorAll("[data-bulk]")) {
        b.onclick = () => {
            const k = b.dataset.bulk;
            if (k === "none") picked = new Set();
            else if (k === "all") picked = new Set(IX.cohorts);
            else picked = new Set(IX.cohorts.filter((c) => c.startsWith(k)));
            renderCohortPicker(); renderFree();
        };
    }
    renderFree();

    const ds = $("#room-day");
    for (const d of DAYS) { const o = el("option", null, d); o.value = DAY_N[d]; ds.appendChild(o); }
    for (const id of ["#room-day", "#room-from", "#room-to"]) $(id).onchange = renderRooms;
    renderRooms();

    const fs = $("#fac-pick");
    for (const f of IX.faculty) { const o = el("option", null, f); o.value = f; fs.appendChild(o); }
    fs.onchange = renderFaculty;
    if (IX.faculty.length) renderFaculty();

    const tt = $("#theme-toggle");
    if (tt) tt.onclick = () => {
        const now = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", now);
        try { localStorage.setItem("theme", now); } catch (e) {}
    };
}

if (typeof CT !== "undefined") init();
else document.addEventListener("DOMContentLoaded", () => { if (typeof CT !== "undefined") init(); });
