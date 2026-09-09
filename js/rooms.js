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

// Not alphabetical: this is where the CSE cohort actually is. M4 holds the
// classrooms, M3 the labs; M1/M2 are the tail. Anything not on the list keeps
// its alphabetical place after the ones that are. Used by both views.
const BLDG_ORDER = ["M4", "M3", "M1", "M2"];
function rankBldg(b) {
    const i = BLDG_ORDER.indexOf(b);
    return i === -1 ? BLDG_ORDER.length : i;
}

function roomSlots(room, day) {
    return SLOTS.filter(x => x.room === room && x.day === day);
}

function floorOf(code) {
    const m = code.match(/^M(\d)-(\d)-/);
    if (!m) return "";
    return `M${m[1]} · ${m[2] === "0" ? "G" : m[2] + "F"}`;
}

const MY_PROG = "y3cse";

function badge(w) {
    const g = w.group === "all" ? "" : ` ${w.group}`;
    const mine = w.prog === MY_PROG ? " mine" : "";
    return `<span class="prog-badge${mine}">${PROGRAMS[w.prog] || w.prog}${g}</span>`;
}

// A lab shared by four Year-1 groups spent four lines on chips. Ours always
// shows; the rest collapse to a count that opens with the card.
function badges(who) {
    const mine = who.filter(w => w.prog === MY_PROG);
    const rest = who.filter(w => w.prog !== MY_PROG);
    if (!rest.length) return mine.map(badge).join("");
    const shown = mine.length ? mine : rest.slice(0, 1);
    const hidden = who.length - shown.length;
    return shown.map(badge).join("") +
        (hidden ? `<span class="prog-badge more">+${hidden}</span>` : "");
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
        return `${slotLabel(cur)}<br>${badges(cur.who)}` +
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

// The building is already the heading and the floor is already the
// sub-heading, so a card that ALSO prints "M4 · G" next to a code that starts
// M4-0- is saying the same thing three times. The card carries the floor only
// when it is the odd one out, which it never is inside a floor group.
function floorLabel(code) {
    const m = code.match(/^M(\d)-(\d)-/);
    if (!m) return "";
    return m[2] === "0" ? "Ground" : `Level ${m[2]}`;
}

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
    const dow = now.getDay();
    const teaching = dow >= 1 && dow <= 5 && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;
    const isToday = dow === viewDay && teaching;

    // building -> floor -> rooms, so neither is ever repeated on a card
    const tree = {};
    for (const r of ALL_ROOMS) {
        ((tree[r.slice(0, 2)] ??= {})[floorLabel(r)] ??= []).push(r);
    }

    let html = "";
    for (const bldg of Object.keys(tree).sort((a, b) => rankBldg(a) - rankBldg(b) || a.localeCompare(b))) {
        html += `<h2 class="bldg-title">${bldg}</h2>`;
        for (const floor of Object.keys(tree[bldg]).sort()) {
            const rooms = tree[bldg][floor];
            const busyRooms = [], freeRooms = [];
            for (const room of rooms) {
                (teaching && roomSlots(room, dow).some(x => mins >= x.from && mins < x.to)
                    ? busyRooms : freeRooms).push(room);
            }

            html += `<h3 class="floor-title">${floor}</h3>`;

            // The page is called Free Rooms, so the free ones are the answer
            // and they get to be one dense line instead of ten cards that each
            // spend two lines saying "free" and "done for today".
            if (freeRooms.length) {
                html += `<div class="free-strip">` + freeRooms.map(room =>
                    `<button class="free-chip" data-room="${room}">` +
                    `<span class="free-chip-name">${ROOM_NAMES[room] || "Room " + room.slice(-3)}</span>` +
                    `<span class="free-chip-code">${room}</span></button>`).join("") + `</div>`;
            }

            if (busyRooms.length) html += `<div class="rooms-grid">`;
            for (const room of busyRooms) {
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
            <article class="room-card busy${open.has(room) ? " open" : ""}" data-room="${room}">
                <div class="room-head">
                    <span class="room-name">${ROOM_NAMES[room] || "Room " + room.slice(-3)}</span>
                    <span class="room-code">${room}</span>
                </div>
                <div class="room-status">${statusHTML(room, now)}</div>
                <div class="room-day">${dayHTML}</div>
            </article>`;
            }

            if (busyRooms.length) html += `</div>`;

            if (!busyRooms.length && !freeRooms.length) {
                html += `<div class="slot-empty">no rooms</div>`;
            }
        }
    }
    body.innerHTML = html;
}

function renderSeg() {
    const seg = document.getElementById("rooms-seg");
    seg.innerHTML = [1, 2, 3, 4, 5].map(d =>
        `<button type="button" data-day="${d}" class="${d === viewDay ? "on" : ""}">${DAY_NAME[d].slice(0, 3)}</button>`
    ).join("");
}

// ============================================================
// FLOOR VIEW — the same occupancy, seen from above.
//
// The polygons are the ones the 3D viewer uses (data/m3-data.js,
// data/m4-data.js): metres, y-down in plan, so they drop straight into an
// SVG viewBox with no transform. Nothing is re-derived here.
//
// Only TIMETABLED rooms are coloured. A toilet or a stairwell is drawn,
// because a floor with holes in it is unreadable, but it is drawn as
// background - it has no timetable and cannot be free or busy. That also
// keeps this view clear of the one known defect in the model: the fuse
// pipeline mis-registers some SMALL rooms' name labels (an 80 m2 "Exec
// Director's Toilet" is the giveaway). Those rooms are unlabelled here, and
// every room that IS labelled is labelled from its timetable code, which
// does not come from that registration.
// ============================================================

// The buildings do not sit square to anything. They are drawn in campus
// coordinates, where M4's walls run about 14.4 degrees off the axes and M3's
// about 12.3 - so a plan straight from the data arrives tilted, and every
// room with it. Measured, not assumed: take every wall segment over 0.8 m,
// fold its direction into a quarter turn (walls are parallel OR square, so
// the four directions are one direction mod 90 degrees), and take the
// length-weighted circular mean. ONE angle per building, from every floor's
// walls together, because two floors of the same building tilting differently
// would look like a bug.
//
// Then each room becomes the RECTANGLE that bounds it. The polygons are
// traced from photographs of evacuation boards, so their edges carry the
// tracing's noise - little notches and 3-vertex slivers that read as sloppy
// at this size. This is a schematic for "can I walk into that room", not a
// survey: rectangles cost about 20% in area (a room's box is bigger than the
// room) and about 1-5% of the floor double-counted where two boxes overlap,
// nearly all of it stairwells, which are long thin diagonals and the one
// shape a bounding box flatters. The SHELL and the corridors keep their true
// outline - that is what still makes the floor recognisable.
// One drawing per LEVEL, both buildings in it, side by side.
//
// Each building is squared about its own centre by its own wall angle (M4
// sits ~14.4 degrees off the axes, M3 ~12.3) and then turned a further 90
// degrees, which stands both of them upright and makes the pair land in a
// landscape box instead of a tall thin one.
//
// They are LAID OUT side by side, not placed at their campus coordinates.
// True placement is honest but unreadable here: M3 sits up and to the left of
// M4, so the drawing came out portrait with two empty corners and both
// buildings small. This is a floor key, not a map - the useful thing is
// seeing every room on one level at a readable size.
const LEVELS = (() => {
    const prepared = [];
    const boxes = new Map();

    for (const b of (window.BUILDINGS || [])) {
        const floors = b.floors || [];
        const cx = b.w / 2, cy = b.d / 2;

        // Measured, not assumed: every wall segment over 0.8 m, its direction
        // folded into a quarter turn (walls are parallel OR square, so the
        // four directions are one direction mod 90 degrees), length-weighted
        // circular mean. One angle per building, from every floor together -
        // two floors of the same building tilting differently would look like
        // a bug.
        let sx = 0, sy = 0;
        for (const f of floors) {
            for (const r of (f.rooms || [])) {
                const p = r.p;
                for (let i = 0; i < p.length; i++) {
                    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
                    const dx = x2 - x1, dy = y2 - y1;
                    const L = Math.hypot(dx, dy);
                    if (L < 0.8) continue;
                    const a = Math.atan2(dy, dx);
                    sx += L * Math.cos(4 * a);
                    sy += L * Math.sin(4 * a);
                }
            }
        }
        const th = -Math.atan2(sy, sx) / 4 + Math.PI / 2;
        const cos = Math.cos(th), sin = Math.sin(th);
        const spin = (pts) => pts.map(([x, y]) => {
            const dx = x - cx, dy = y - cy;
            return [dx * cos - dy * sin, dx * sin + dy * cos];
        });

        const env = spin(b.envelope);
        boxes.set(b.building, {
            x0: Math.min(...env.map(q => q[0])),
            y0: Math.min(...env.map(q => q[1])),
            w: Math.max(...env.map(q => q[0])) - Math.min(...env.map(q => q[0])),
            h: Math.max(...env.map(q => q[1])) - Math.min(...env.map(q => q[1])),
        });

        prepared.push({ b, floors, spin });
    }

    // Lay the buildings out left to right in the page's own priority order,
    // tops aligned, with a lane between them.
    const gap = 3;
    const order = prepared.slice().sort((a, b) => rankBldg(a.b.building) - rankBldg(b.b.building));
    const pad = 1.2;
    let cursor = pad;
    const offset = new Map();
    for (const q of order) {
        offset.set(q.b.building, cursor);
        cursor += boxes.get(q.b.building).w + gap;
    }
    const W = cursor - gap + pad;
    const H = Math.max(...[...boxes.values()].map(v => v.h)) + pad * 2 + 2.4;  // 2.4 leaves the building tag its line

    const byLevel = new Map();
    for (const { b, floors, spin } of order) {
        const box = boxes.get(b.building);
        const dx = offset.get(b.building) - box.x0;
        const dy = pad + 2.4 - box.y0;
        const place = (pts) => spin(pts).map(([x, y]) => [x + dx, y + dy]);

        // Each room becomes the RECTANGLE that bounds it. The polygons are
        // traced from photographs of evacuation boards and carry the tracing's
        // noise - notches and 3-vertex slivers that read as sloppy at this
        // size. This is a schematic: boxes run about 20% larger than the rooms
        // and 1-5% of a floor gets double-counted where two overlap, nearly
        // all of it stairwells, which are long thin diagonals and the one
        // shape a bounding box flatters. Shell and corridors keep their true
        // outline, which is what still makes the floor recognisable.
        const boxOf = (pts) => {
            const q = place(pts);
            const bx = q.map(v => v[0]), by = q.map(v => v[1]);
            const a = Math.min(...bx), c = Math.min(...by);
            const e = Math.max(...bx), g = Math.max(...by);
            return [[a, c], [e, c], [e, g], [a, g]];
        };

        for (const f of floors) {
            const part = {
                bldg: b.building,
                envelope: place(b.envelope),
                corridor: (f.corridor || []).map(c => ({ ...c, p: place(c.p) })),
                rooms: (f.rooms || []).map(r => ({ ...r, p: boxOf(r.p) })),
            };
            if (!byLevel.has(f.level)) {
                byLevel.set(f.level, {
                    level: f.level, w: W, d: H, parts: [],
                    label: f.level === 0 ? "Ground floor" : `Level ${f.level}`,
                });
            }
            byLevel.get(f.level).parts.push(part);
        }
    }
    return [...byLevel.values()].sort((a, b) => a.level - b.level);
})();

// "Classroom 3" -> "CR 3", "Computer Lab 03" -> "CL 03", "Energy Lab" ->
// "Energy". A room is a few metres wide on screen; the full name does not
// fit and a clipped name is worse than a short one.
function shortName(name) {
    const n = String(name).replace(/\s*\(.*\)\s*$/, "").split("/")[0].trim();
    let m = n.match(/^Classroom\s+(\S+)$/i);
    if (m) return `CR ${m[1]}`;
    m = n.match(/^Computer Lab\s*(\S*)$/i);
    if (m) return `CL ${m[1]}`.trim();
    m = n.match(/^(\S+)\s+Lab$/i);
    if (m) return m[1];
    m = n.match(/^Conference Room\s*(\S*)$/i);
    if (m) return `CF ${m[1]}`.trim();
    if (/^Lecture Hall$/i.test(n)) return "Hall";
    return n;
}

function shortLabel(code) {
    return shortName(ROOM_NAMES[code] || code);
}

// WHAT GETS COLOURED. A room you could sit a class in - classroom, lab,
// lecture hall, conference room. Everything else (offices, workstations,
// toilets, stairs, stores, plant) is background: not because it is busy, but
// because it is not a room anyone comes to this page looking for.
//
// The area floor does a second job. These names come off the evacuation
// boards through an affine registration that mis-lands the labels of SMALL
// rooms - an 80 m2 "Exec Director's Toilet" is the tell, and a 3.3 m2 "Cell
// Culture Room" is the same bug from the other side. Nothing under 20 m2 is
// trusted with a name here, and that is exactly the band the bug lives in.
const BOOKABLE_KINDS = new Set(["classroom", "lab", "lecture"]);
function isBookable(r) {
    if (r.code && ROOM_NAMES[r.code]) return true;          // timetabled, always
    if (!r.name || r.area < 20) return false;
    return BOOKABLE_KINDS.has(r.kind) || /^Conference Room/i.test(r.name);
}

// Area-weighted centroid. A plain average of the vertices drifts toward
// whichever edge carries the most points, which on these polygons (one long
// wall traced in detail) puts the label outside the room.
function centroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        const cross = x1 * y2 - x2 * y1;
        a += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
    }
    if (!a) {
        const n = pts.length;
        return [pts.reduce((s, q) => s + q[0], 0) / n, pts.reduce((s, q) => s + q[1], 0) / n];
    }
    a *= 0.5;
    return [cx / (6 * a), cy / (6 * a)];
}

// free / busy for the colour fill. Always wall-clock now, like the cards -
// the point of this view is "what can I walk into right now".
function liveState(room, now) {
    const today = ymd(now);
    const dow = now.getDay();
    const teaching = dow >= 1 && dow <= 5 && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;
    if (!teaching) return "free";
    const mins = now.getHours() * 60 + now.getMinutes();
    return roomSlots(room, dow).some(x => mins >= x.from && mins < x.to) ? "busy" : "free";
}

function poly(pts) {
    return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

function renderFloors() {
    const body = document.getElementById("floor-body");
    if (!body) return;
    const now = new Date();

    if (!LEVELS.length) {
        body.innerHTML = `<p class="slot-empty">No floor model loaded.</p>`;
        return;
    }

    const bookableOf = (part) => part.rooms.filter(isBookable);

    const drawPart = (part) => {
        const rooms = part.rooms.filter(isBookable);
        const bg = part.rooms.filter(r => !isBookable(r));
        const ex = Math.min(...part.envelope.map(q => q[0]));
        const ey = Math.min(...part.envelope.map(q => q[1]));

        return `
        <g class="fp-part">
            <polygon class="fp-shell" points="${poly(part.envelope)}"/>
            ${part.corridor.map(c => `<polygon class="fp-corridor" points="${poly(c.p)}"/>`).join("")}
            ${bg.map(r => `<polygon class="fp-other" points="${poly(r.p)}"/>`).join("")}
            ${rooms.map(r => {
                const timetabled = !!(r.code && ROOM_NAMES[r.code]);
                // No timetable means nothing in the eleven sheets books it,
                // so as far as this page can know it is free - all week,
                // weekend included. Drawing it grey said "unavailable", which
                // is the opposite of the truth.
                const st = timetabled ? liveState(r.code, now) : "free";
                const name = timetabled ? ROOM_NAMES[r.code] : r.name;
                const [cx, cy] = centroid(r.p);
                const tag = timetabled
                    ? `<g class="fp-room fp-${st}" data-room="${r.code}" tabindex="0"
                           role="button" aria-label="${name}, ${st}">`
                    // nothing to open: a room with no bookings has no day to show
                    : `<g class="fp-room fp-${st} fp-untimed" aria-label="${name}, no timetable">`;
                return `${tag}
                        <polygon points="${poly(r.p)}"/>
                        <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}">${shortName(name)}</text>
                    </g>`;
            }).join("")}
            <text class="fp-bldg-tag" x="${ex.toFixed(2)}" y="${(ey - 1.1).toFixed(2)}">${part.bldg}</text>
        </g>`;
    };

    body.innerHTML = LEVELS.map((lv) => {
        const rooms = lv.parts.flatMap(bookableOf);
        const freeN = rooms.filter(r => !(r.code && ROOM_NAMES[r.code]) ||
                                        liveState(r.code, now) === "free").length;
        return `
        <section class="fp-floor">
            <h2 class="bldg-title">${lv.label}
                <span class="fp-count">${freeN}/${rooms.length} free</span>
            </h2>
            <svg class="fp-svg" viewBox="0 0 ${lv.w.toFixed(2)} ${lv.d.toFixed(2)}" role="img"
                 aria-label="${lv.label}, M4 and M3">
                ${lv.parts.map(drawPart).join("")}
            </svg>
        </section>`;
    }).join("") + `
        <p class="rooms-foot fp-note">Schematic. Both buildings are turned
        upright (they sit about 13° off square) and rooms are drawn as
        rectangles, but M3 is placed where it really is relative to M4. A room
        with no timetable — Classroom 1, the Workshop — shows free because
        nothing in the eleven sheets books it; a club or a one-off booking
        would not appear. Only the ones with a timetable can be tapped.</p>`;
}

// ---------- room popup ----------

function openRoom(room) {
    const wrap = document.getElementById("fp-modal");
    if (!wrap) return;
    const now = new Date();
    const daySlots = roomSlots(room, viewDay);
    const mins = now.getHours() * 60 + now.getMinutes();
    const today = ymd(now);
    const isToday = now.getDay() === viewDay && !NO_CLASS[today] && today >= TERM.start && today <= TERM.end;

    const rows = daySlots.length
        ? daySlots.map((x) => {
            const state = !isToday ? "" : mins >= x.to ? " past" : (mins >= x.from ? " live" : "");
            return `
            <div class="slot-row${state}">
                <span class="slot-time">${t12(x.s)} – ${t12(x.e)}</span>
                <div class="slot-main">${slotLabel(x)}
                    <div class="slot-progs">${x.who.map(badge).join("")}</div>
                </div>
            </div>`;
        }).join("")
        : `<div class="slot-empty">nothing scheduled ${DAY_NAME[viewDay]}</div>`;

    wrap.innerHTML = `
    <div class="fp-sheet" role="dialog" aria-modal="true" aria-label="${ROOM_NAMES[room] || room}">
        <div class="fp-sheet-head">
            <div>
                <span class="room-name">${ROOM_NAMES[room] || room}</span>
                <span class="room-code">${room}</span>
            </div>
            <button type="button" class="fp-close" aria-label="Close">×</button>
        </div>
        <div class="room-status">${statusHTML(room, now)}</div>
        <div class="fp-sheet-day">
            <span class="fp-day-label">${DAY_NAME[viewDay]}</span>
            ${rows}
        </div>
    </div>`;
    wrap.hidden = false;
    document.body.classList.add("fp-locked");
}

function closeRoom() {
    const wrap = document.getElementById("fp-modal");
    if (!wrap) return;
    wrap.hidden = true;
    wrap.innerHTML = "";
    document.body.classList.remove("fp-locked");
}

// ---------- view switch ----------

let viewMode = "list";

function renderChrome(now) {
    document.getElementById("rooms-clock").textContent =
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    document.getElementById("rooms-offnote").textContent = offNote(now);
}

function renderView() {
    const listBody = document.getElementById("rooms-body");
    const floorBody = document.getElementById("floor-body");
    listBody.hidden = viewMode !== "list";
    floorBody.hidden = viewMode !== "floor";
    if (viewMode === "list") renderRooms(); else { renderChrome(new Date()); renderFloors(); }
}

function renderViewSeg() {
    const seg = document.getElementById("rooms-view-seg");
    if (!seg) return;
    seg.innerHTML = [["list", "Rooms"], ["floor", "Floors"]].map(([v, label]) =>
        `<button type="button" data-view="${v}" class="${v === viewMode ? "on" : ""}">${label}</button>`
    ).join("");
}

// ---------- wiring ----------

document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("#rooms-view-seg button");
    if (viewBtn) {
        viewMode = viewBtn.dataset.view;
        renderViewSeg(); renderView();
        return;
    }
    const dayBtn = e.target.closest("#rooms-seg button");
    if (dayBtn) {
        viewDay = Number(dayBtn.dataset.day);
        renderSeg(); renderView();
        return;
    }
    // The popup sits above everything, so it gets first refusal on a click.
    if (e.target.closest(".fp-close") || e.target.id === "fp-modal") { closeRoom(); return; }
    if (e.target.closest(".fp-sheet")) return;

    const shape = e.target.closest(".fp-room");
    if (shape) { openRoom(shape.dataset.room); return; }

    const card = e.target.closest(".room-card");
    if (card) card.classList.toggle("open");

    // A free room is a chip, not a card, but the hero still promises "tap a
    // room for its full day". Tapping one expands it in place into the same
    // day timeline a card shows, so the promise holds for every room.
    const chip = e.target.closest(".free-chip");
    if (chip) {
        const room = chip.dataset.room;
        const existing = document.querySelector(`.free-day[data-room="${room}"]`);
        if (existing) { existing.remove(); chip.classList.remove("on"); return; }
        document.querySelectorAll(".free-day").forEach(n => n.remove());
        document.querySelectorAll(".free-chip.on").forEach(n => n.classList.remove("on"));
        chip.classList.add("on");

        const slots = roomSlots(room, viewDay);
        const rows = slots.length
            ? slots.map(x => `
                <div class="slot-row">
                    <span class="slot-time">${t12(x.s)} – ${t12(x.e)}</span>
                    <div class="slot-main">${slotLabel(x)}
                        <div class="slot-progs">${badges(x.who)}</div>
                    </div>
                </div>`).join("")
            : `<div class="slot-empty">nothing scheduled ${DAY_NAME[viewDay]}</div>`;

        const box = document.createElement("div");
        box.className = "free-day";
        box.dataset.room = room;
        box.innerHTML = `<div class="free-day-head">${ROOM_NAMES[room] || room} <span class="room-code">${room}</span></div>${rows}`;
        chip.closest(".free-strip").after(box);
    }
});

// A tapped room is a button, so it answers the keyboard too.
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeRoom(); return; }
    if (e.key !== "Enter" && e.key !== " ") return;
    const shape = e.target.closest && e.target.closest(".fp-room");
    if (shape) { e.preventDefault(); openRoom(shape.dataset.room); }
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
renderViewSeg();
renderView();

// Same contract as the bus/timetable pages: cheap minute tick plus a
// forced re-render whenever the page comes back in front of a human.
let roomsLastMin = null;
setInterval(() => {
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m === roomsLastMin) return;
    roomsLastMin = m;
    renderView();
}, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderView(); });
window.addEventListener("pageshow", renderView);
