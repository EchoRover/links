// ============================================================
// ROOM OCCUPANCY — the "who's in which room" dashboard.
//
// Data comes from rooms-data.js (OCC / ROOM_NAMES / PROGRAMS /
// COURSE_TITLES). timetable.js is loaded first and this file leans
// on its helpers (tmin, t12, left, ymd) and its calendar (TERM,
// NO_CLASS, DAY_NAME) so term bounds and holidays live in exactly
// one place. Its own render is a no-op here — no #tt-body on this
// page.
//
// Two views in one:
//   - every room card shows a LIVE status line (always wall-clock now)
//   - the day switcher + tap-to-expand shows any room's full weekday
// ============================================================

// The same lecture often appears on several programs' sheets (shared
// electives, co-taught HUL slots). Merge identical (day, time, course,
// room) rows into one slot carrying every program that attends.
const SLOTS = (() => {
    const map = new Map();
    for (const [day, s, e, code, room, prog, group, kind] of OCC) {
        const key = [day, s, e, code, room].join("|");
        if (!map.has(key)) {
            map.set(key, { day, s, e, code, room, kind, from: tmin(s), to: tmin(e), who: [] });
        }
        map.get(key).who.push({ prog, group });
    }
    return [...map.values()].sort((a, b) => a.from - b.from);
})();

const ALL_ROOMS = [...new Set(SLOTS.map(x => x.room))].sort();

const ROOM_KIND_LABEL = { lec: "Lecture", tut: "Tutorial", lab: "Lab", res: "Reserved" };

function roomSlots(room, day) {
    return SLOTS.filter(x => x.room === room && x.day === day);
}

function floorOf(code) {
    const m = code.match(/^M(\d)-(\d)-/);
    if (!m) return "";
    return `M${m[1]} · ${m[2] === "0" ? "G" : m[2] + "F"}`;
}

function badge(w) {
    const g = w.group === "all" ? "" : ` ${w.group}`;
    return `<span class="prog-badge">${PROGRAMS[w.prog] || w.prog}${g}</span>`;
}

function slotLabel(x) {
    const title = COURSE_TITLES[x.code] || "";
    return `<span class="slot-course">${x.code}</span>` +
        (title ? ` <span class="slot-title">${title}</span>` : "") +
        `<span class="kind-chip">${ROOM_KIND_LABEL[x.kind] || "Class"}</span>`;
}

// ---------- day selection ----------

// Weekdays only — the sheets schedule nothing on Sat/Sun. On a weekend
// (or holiday) the switcher defaults to the next teaching day.
let viewDay = null;

function defaultDay(now) {
    const today = ymd(now);
    const dow = now.getDay();
    if (dow >= 1 && dow <= 5 && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end) return dow;
    for (let i = 1; i <= 8; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        if (d.getDay() >= 1 && d.getDay() <= 5 && !NO_CLASS[ymd(d)]) return d.getDay();
    }
    return 1;
}

function offNote(now) {
    const today = ymd(now);
    if (today < TERM.start) return `classes start ${TERM.start.split("-").reverse().join("/")}`;
    if (today > TERM.end) return "semester's over";
    if (NO_CLASS[today]) return `today: ${NO_CLASS[today]}, no classes`;
    const dow = now.getDay();
    if (dow === 0 || dow === 6) return "weekend, all rooms free today";
    return "";
}

// ---------- live status line (always wall-clock, regardless of viewDay) ----------

function statusHTML(room, now) {
    const today = ymd(now);
    const dow = now.getDay();
    const teaching = dow >= 1 && dow <= 5 && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;
    if (!teaching) return `<span class="st-free">free</span>`;

    const mins = now.getHours() * 60 + now.getMinutes();
    const list = roomSlots(room, dow);
    const cur = list.find(x => mins >= x.from && mins < x.to);
    const nxt = list.filter(x => x.from > mins).sort((a, b) => a.from - b.from)[0];

    if (cur) {
        const then = nxt && nxt.from <= cur.to + 10
            ? ` · then ${nxt.code} at ${t12(nxt.s)}` : "";
        return `${slotLabel(cur)}<br>${cur.who.map(badge).join("")}` +
            `<span class="st-when">ends in <b>${left(cur.to - mins)}</b> (${t12(cur.e)})${then}</span>`;
    }
    if (nxt) {
        return `<span class="st-free">free</span>` +
            `<span class="st-when">next: ${nxt.code} ${nxt.who.map(w => PROGRAMS[w.prog]).join(", ")} ` +
            `at ${t12(nxt.s)}, in <b>${left(nxt.from - mins)}</b></span>`;
    }
    return `<span class="st-free">free</span><span class="st-when">done for today</span>`;
}

// ---------- render ----------

function renderRooms() {
    const now = new Date();
    const body = document.getElementById("rooms-body");
    if (!body) return;

    document.getElementById("rooms-clock").textContent =
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    document.getElementById("rooms-offnote").textContent = offNote(now);

    const open = new Set([...document.querySelectorAll(".room-card.open")].map(c => c.dataset.room));

    const mins = now.getHours() * 60 + now.getMinutes();
    const today = ymd(now);
    const isToday = now.getDay() === viewDay && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;

    const byBldg = {};
    for (const r of ALL_ROOMS) (byBldg[r.slice(0, 2)] ??= []).push(r);

    let html = "";
    for (const bldg of Object.keys(byBldg).sort()) {
        html += `<h2 class="bldg-title">Building ${bldg}</h2><div class="rooms-grid">`;
        for (const room of byBldg[bldg]) {
            const dow = now.getDay();
            const teaching = dow >= 1 && dow <= 5 && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;
            const busy = teaching && roomSlots(room, dow).some(x => mins >= x.from && mins < x.to);

            const daySlots = roomSlots(room, viewDay);
            let dayHTML = daySlots.length ? "" : `<div class="slot-empty">nothing scheduled ${DAY_NAME[viewDay]}</div>`;
            for (const x of daySlots) {
                const state = !isToday ? "" : mins >= x.to ? " past" : (mins >= x.from ? " live" : "");
                dayHTML += `
                <div class="slot-row${state}">
                    <span class="slot-time">${t12(x.s)} – ${t12(x.e)}</span>
                    <div class="slot-main">${slotLabel(x)}
                        <div class="slot-progs">${x.who.map(badge).join("")}</div>
                    </div>
                </div>`;
            }

            html += `
            <article class="room-card${busy ? " busy" : ""}${open.has(room) ? " open" : ""}" data-room="${room}">
                <div class="room-head">
                    <span class="room-name">${ROOM_NAMES[room] || "Room " + room.slice(-3)}</span>
                    <span class="room-floor">${floorOf(room)}</span>
                    <span class="room-code">${room}</span>
                </div>
                <div class="room-status">${statusHTML(room, now)}</div>
                <div class="room-day">${dayHTML}</div>
            </article>`;
        }
        html += `</div>`;
    }
    body.innerHTML = html;
}

function renderSeg() {
    const seg = document.getElementById("rooms-seg");
    seg.innerHTML = [1, 2, 3, 4, 5].map(d =>
        `<button type="button" data-day="${d}" class="${d === viewDay ? "on" : ""}">${DAY_NAME[d].slice(0, 3)}</button>`
    ).join("");
}

// ---------- wiring ----------

document.addEventListener("click", (e) => {
    const dayBtn = e.target.closest("#rooms-seg button");
    if (dayBtn) {
        viewDay = Number(dayBtn.dataset.day);
        renderSeg(); renderRooms();
        return;
    }
    const card = e.target.closest(".room-card");
    if (card) card.classList.toggle("open");
});

// Theme toggle — scripts.js isn't loaded on sub-pages, so wire it here
// (same pattern as the bus page).
document.getElementById("theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
});

viewDay = defaultDay(new Date());
renderSeg();
renderRooms();

// Same contract as the bus/timetable pages: cheap minute tick plus a
// forced re-render whenever the page comes back in front of a human.
let roomsLastMin = null;
setInterval(() => {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m === roomsLastMin) return;
    roomsLastMin = m;
    renderRooms();
}, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderRooms(); });
window.addEventListener("pageshow", renderRooms);
