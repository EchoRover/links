// ============================================================
// PLAN EDITOR — correct the auto-detected rooms by hand.
//
// The evacuation boards are the source of truth for layout. The
// colour segmentation in tools/build_board.py gets most rooms in
// one pass, but it loses rooms under camera glare, skips fills it
// has not seen, and picks up junk off the key-plan thumbnail. All
// of that is faster to fix by hand than to keep tuning, so this is
// where it gets fixed.
//
// Edits live in localStorage per board, and "export" prints a JS
// block to paste back into boards-data.js.
// ============================================================

const cvs = document.getElementById("ed");
const ctx = cvs.getContext("2d");

// ---------- state ----------

const KEY = "linkcs.planedit.v1";
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { store = {}; }

let boardId = Object.keys(BOARDS)[0];
let rooms = [];          // [{poly:[[x,y]..], name, code}]
let img = null;
let sel = null;          // index into rooms
let mode = "select";
let draft = null;        // polygon being drawn
let undo = [];

function save() {
    store[boardId] = rooms;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
}

function pushUndo() {
    undo.push(JSON.stringify(rooms));
    if (undo.length > 60) undo.shift();
}

function loadBoard(id) {
    boardId = id;
    const b = BOARDS[id];
    rooms = store[id]
        ? JSON.parse(JSON.stringify(store[id]))
        : b.rooms.map(r => ({ poly: r.poly.map(p => p.slice()), name: r.name || "", code: "" }));
    sel = null; draft = null; undo = [];
    img = new Image();
    img.onload = () => { fit(); draw(); };
    img.src = b.img;
    buildBoardBar();
    renderSide();
}

// ---------- view ----------

let view = { x: 0, y: 0, k: 1 };

function fit() {
    const b = BOARDS[boardId];
    const r = cvs.getBoundingClientRect();
    cvs.width = r.width * devicePixelRatio;
    cvs.height = r.height * devicePixelRatio;
    const k = Math.min(r.width / b.w, r.height / b.h) * 0.96;
    view = { k, x: (r.width - b.w * k) / 2, y: (r.height - b.h * k) / 2 };
}

const toScreen = (x, y) => [x * view.k + view.x, y * view.k + view.y];
function toImage(ev) {
    const r = cvs.getBoundingClientRect();
    return [(ev.clientX - r.left - view.x) / view.k, (ev.clientY - r.top - view.y) / view.k];
}

// ---------- drawing ----------

function draw() {
    const r = cvs.getBoundingClientRect();
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg-card") || "#fff";
    ctx.fillRect(0, 0, r.width, r.height);
    if (!img || !img.complete) return;

    ctx.save();
    ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);
    ctx.drawImage(img, 0, 0, BOARDS[boardId].w, BOARDS[boardId].h);
    ctx.restore();

    const line = 1.6;
    rooms.forEach((rm, i) => {
        const named = !!(rm.name || rm.code);
        ctx.beginPath();
        rm.poly.forEach(([x, y], j) => {
            const [sx, sy] = toScreen(x, y);
            j ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = i === sel ? "rgba(30,64,175,0.34)"
                      : named ? "rgba(15,118,110,0.20)" : "rgba(185,28,28,0.16)";
        ctx.fill();
        ctx.lineWidth = i === sel ? line * 2 : line;
        ctx.strokeStyle = i === sel ? "#1E40AF" : named ? "#0F766E" : "#B91C1C";
        ctx.stroke();

        const [lx, ly] = toScreen(...anchorOf(rm.poly));
        ctx.font = "600 12px ui-monospace, JetBrains Mono, monospace";
        ctx.textAlign = "center";
        const label = rm.name || rm.code || String(i);
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(255,255,255,0.86)";
        ctx.fillRect(lx - w / 2, ly - 9, w, 17);
        ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
        ctx.strokeRect(lx - w / 2, ly - 9, w, 17);
        ctx.fillStyle = "#0E1726";
        ctx.fillText(label, lx, ly + 4);
    });

    // corner handles on the selected room
    if (sel !== null && rooms[sel]) {
        for (const [x, y] of rooms[sel].poly) {
            const [sx, sy] = toScreen(x, y);
            ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7);
            ctx.fillStyle = "#fff"; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = "#1E40AF"; ctx.stroke();
        }
    }

    if (draft && draft.length) {
        ctx.beginPath();
        draft.forEach(([x, y], j) => {
            const [sx, sy] = toScreen(x, y);
            j ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
        });
        ctx.lineWidth = 2; ctx.strokeStyle = "#6D28D9"; ctx.stroke();
        draft.forEach(([x, y], j) => {
            const [sx, sy] = toScreen(x, y);
            ctx.beginPath(); ctx.arc(sx, sy, j === 0 ? 7 : 4, 0, 7);
            ctx.fillStyle = j === 0 ? "#6D28D9" : "#fff"; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = "#6D28D9"; ctx.stroke();
        });
    }
}

// label anchor: centroid unless it falls outside, then the widest vertex gap midpoint
function anchorOf(poly) {
    let sx = 0, sy = 0;
    for (const [x, y] of poly) { sx += x; sy += y; }
    const c = [sx / poly.length, sy / poly.length];
    return inside(poly, c) ? c : poly[0];
}

function inside(poly, [px, py]) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

// ---------- interaction ----------

let drag = null, vdrag = null;

cvs.addEventListener("pointerdown", ev => {
    const p = toImage(ev);
    if (mode === "draw") return;
    if (sel !== null && rooms[sel]) {
        const hit = rooms[sel].poly.findIndex(([x, y]) =>
            Math.hypot(x - p[0], y - p[1]) * view.k < 8);
        if (hit >= 0) { pushUndo(); vdrag = hit; return; }
    }
    drag = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y, moved: false, id: ev.pointerId };
});

cvs.addEventListener("pointermove", ev => {
    if (vdrag !== null) {
        rooms[sel].poly[vdrag] = toImage(ev).map(v => Math.round(v));
        draw(); return;
    }
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true; cvs.setPointerCapture(drag.id); cvs.classList.add("dragging");
    }
    if (!drag.moved) return;
    view.x = drag.vx + dx; view.y = drag.vy + dy;
    draw();
});

cvs.addEventListener("pointerup", ev => {
    if (vdrag !== null) { vdrag = null; save(); draw(); return; }
    const p = toImage(ev);
    if (mode === "draw") {
        if (!draft) draft = [];
        // clicking the first dot closes the shape
        if (draft.length > 2 && Math.hypot(draft[0][0] - p[0], draft[0][1] - p[1]) * view.k < 10) {
            closeDraft();
        } else {
            draft.push(p.map(v => Math.round(v)));
        }
        draw(); return;
    }
    if (drag && !drag.moved) {
        // topmost room under the cursor, smallest first so a room inside a room is reachable
        const hits = rooms.map((r, i) => [i, r]).filter(([, r]) => inside(r.poly, p));
        hits.sort((a, b) => area(a[1].poly) - area(b[1].poly));
        sel = hits.length ? hits[0][0] : null;
        renderSide();
    }
    if (drag && drag.moved) cvs.releasePointerCapture(drag.id);
    drag = null; cvs.classList.remove("dragging");
    draw();
});

cvs.addEventListener("wheel", ev => {
    ev.preventDefault();
    const [ix, iy] = toImage(ev);
    const f = Math.exp(-ev.deltaY * 0.0015);
    const k = Math.max(0.1, Math.min(30, view.k * f));
    const r = cvs.getBoundingClientRect();
    view.x = (ev.clientX - r.left) - ix * k;
    view.y = (ev.clientY - r.top) - iy * k;
    view.k = k;
    draw();
}, { passive: false });

function area(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
        a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    return Math.abs(a / 2);
}

function closeDraft() {
    if (draft && draft.length > 2) {
        pushUndo();
        rooms.push({ poly: draft, name: "", code: "" });
        sel = rooms.length - 1;
        save(); renderSide();
    }
    draft = null;
}

addEventListener("keydown", ev => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    if (ev.key === "Enter" && draft) { closeDraft(); draw(); }
    else if (ev.key === "Escape") { draft = null; draw(); }
    else if ((ev.key === "Delete" || ev.key === "Backspace") && sel !== null) {
        pushUndo(); rooms.splice(sel, 1); sel = null; save(); renderSide(); draw(); ev.preventDefault();
    } else if (ev.key.toLowerCase() === "z" && undo.length) {
        rooms = JSON.parse(undo.pop()); sel = null; save(); renderSide(); draw();
    }
});

// ---------- side panel ----------

function codesFor(id) {
    const b = BOARDS[id];
    const pre = `${b.building}-${b.level}-`;
    return [...new Set(OCC.map(o => o[4]))].filter(c => c.startsWith(pre)).sort();
}

function renderSide() {
    const side = document.getElementById("ed-side");
    const codes = codesFor(boardId);
    const used = new Set(rooms.map(r => r.code).filter(Boolean));
    let h = "";

    if (sel !== null && rooms[sel]) {
        const r = rooms[sel];
        h += `<h4>room ${sel}</h4>
              <input id="ed-name" placeholder="name, e.g. Lectures Hall" value="${(r.name || "").replace(/"/g, "&quot;")}">
              <select id="ed-code">
                <option value="">— timetable code (optional) —</option>
                ${codes.map(c => `<option value="${c}"${c === r.code ? " selected" : ""}${used.has(c) && c !== r.code ? " disabled" : ""}>${c} · ${ROOM_NAMES[c] || "?"}${used.has(c) && c !== r.code ? " (used)" : ""}</option>`).join("")}
              </select>
              <button class="ed-btn danger" id="ed-del" style="width:100%">delete this room</button>`;
    } else {
        h += `<h4>nothing selected</h4><p class="ed-empty">Click a room to name it, or switch to
              <b>draw</b> and trace one the detector missed.</p>`;
    }

    const named = rooms.filter(r => r.name || r.code).length;
    const placed = codes.filter(c => used.has(c)).length;
    h += `<div class="ed-count"><b>${rooms.length}</b> rooms · <b>${named}</b> named<br>
          <b>${placed}</b> of <b>${codes.length}</b> timetable codes placed</div>`;

    h += `<div class="ed-list">` + rooms.map((r, i) =>
        `<div class="ed-row ${i === sel ? "on " : ""}${(r.name || r.code) ? "named" : "unnamed"}" data-i="${i}">
           <span class="t">${r.name || r.code || "unnamed"}</span><span class="n">${i}</span></div>`).join("") + `</div>`;
    side.innerHTML = h;

    const nm = document.getElementById("ed-name");
    if (nm) {
        nm.addEventListener("input", () => { rooms[sel].name = nm.value; save(); draw(); });
        document.getElementById("ed-code").addEventListener("change", e => {
            rooms[sel].code = e.target.value;
            if (!rooms[sel].name && e.target.value) rooms[sel].name = ROOM_NAMES[e.target.value] || "";
            save(); renderSide(); draw();
        });
        document.getElementById("ed-del").addEventListener("click", () => {
            pushUndo(); rooms.splice(sel, 1); sel = null; save(); renderSide(); draw();
        });
    }
    for (const row of side.querySelectorAll(".ed-row")) {
        row.addEventListener("click", () => { sel = +row.dataset.i; renderSide(); draw(); });
    }
}

// ---------- toolbar ----------

function buildBoardBar() {
    const bar = document.getElementById("ed-boards");
    bar.innerHTML = "";
    for (const id in BOARDS) {
        const b = document.createElement("button");
        // keep the building in the tab: two boards are both "Ground", two both "Level 01"
        b.textContent = BOARDS[id].label.replace(" - wing", " w");
        b.title = BOARDS[id].label;
        b.className = id === boardId ? "on" : "";
        b.addEventListener("click", () => loadBoard(id));
        bar.appendChild(b);
    }
}

for (const b of document.querySelectorAll("#ed-modes button")) {
    b.addEventListener("click", () => {
        mode = b.dataset.mode;
        draft = null;
        document.body.classList.toggle("drawing", mode === "draw");
        for (const o of document.querySelectorAll("#ed-modes button")) o.classList.toggle("on", o === b);
        draw();
    });
}
document.getElementById("ed-fit").addEventListener("click", () => { fit(); draw(); });
document.getElementById("ed-export").addEventListener("click", ev => {
    const out = {};
    for (const id in BOARDS) {
        const rs = store[id] || BOARDS[id].rooms.map(r => ({ poly: r.poly, name: "", code: "" }));
        out[id] = { building: BOARDS[id].building, level: BOARDS[id].level,
                    label: BOARDS[id].label, img: BOARDS[id].img,
                    w: BOARDS[id].w, h: BOARDS[id].h,
                    rooms: rs.map((r, i) => ({ i, poly: r.poly, name: r.name || null, code: r.code || null })) };
    }
    const txt = "const BOARDS = " + JSON.stringify(out) + ";\n";
    navigator.clipboard.writeText(txt).then(() => {
        ev.target.textContent = "copied ✓";
        setTimeout(() => ev.target.textContent = "export", 1500);
    }, () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([txt], { type: "text/javascript" }));
        a.download = "boards-data.js"; a.click();
    });
});
document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("theme", cur); } catch (e) { }
    draw();
});
addEventListener("resize", () => { fit(); draw(); });

loadBoard(boardId);
