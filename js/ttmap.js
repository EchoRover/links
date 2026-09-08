// ============================================================
// TIMETABLE MAP — the parse drawn on top of the sheet it came from.
//
// Every block carries the page coordinates of the cell it was read from
// (tools/parse_timetable.py emits `bbox` in points and `page.scale`), so
// the prediction can be drawn in place instead of listed in a table.
//
// That is the whole idea. A wrong block in a table of times is invisible;
// you have to hold the grid in your head to catch it. Drawn on the page it
// is just wrong to look at: the box sits off the cell, or covers two, or
// is the wrong colour for its course. Reviewing becomes looking.
//
// Boxes are tinted with the SHEET'S OWN fill colour, read out of the PDF.
// The sheet already colour-codes courses; borrowing that is what makes
// "same colour, same course" a real check rather than decoration.
//
// The page scrolls normally. No fixed heights, no inner scroll container.
// ============================================================

const SRC = "data/timetables/parsed.json";
const KEY = "linkcs.ttmap.v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_NO = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
const KINDS = ["", "tut", "lab", "proj"];
const KIND_LABEL = { "": "lecture", tut: "tutorial", lab: "lab", proj: "project" };
const MIN_PER_HOUR = 50;
const BUCKET = { "": "L", tut: "T", lab: "P", proj: "P" };

const $ = (s) => document.querySelector(s);

let DATA = {};
let store = { edits: {}, regions: {} };
let sheet = null;
let zoom = 1;
let sel = null;
let onlyFlagged = false;
let drawing = null;          // "grid" | "courses" while arming a region

// ---------- state ----------

function load() {
    try { store = JSON.parse(localStorage.getItem(KEY)) || store; } catch (e) { /* blocked */ }
    store.edits = store.edits || {};
    store.regions = store.regions || {};
}

function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* quota */ }
}

function rowOf(i) {
    return { ...DATA[sheet].blocks[i], ...((store.edits[sheet] || {})[i] || {}) };
}

function setField(i, field, value) {
    store.edits[sheet] = store.edits[sheet] || {};
    store.edits[sheet][i] = store.edits[sheet][i] || {};
    store.edits[sheet][i][field] = value;
    save();
}

const live = () => DATA[sheet].blocks
    .map((_, i) => ({ i, r: rowOf(i) }))
    .filter(({ r }) => !r._cut);

// ---------- reconciliation ----------

function mins(a, b) {
    if (!a || !b) return 0;
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return (bh * 60 + bm) - (ah * 60 + am);
}

const nominal = (m) => Math.round(m / MIN_PER_HOUR);

// The sheet's L-T-P-C table against what the grid gave us. It is the half
// of the document the grid was never transcribed from, so a mismatch is
// evidence rather than a second opinion.
function reconcile(code) {
    const c = (DATA[sheet].courses || {})[code] || {};
    const rows = live().filter(({ r }) => r.course === code);
    const have = { L: 0, T: 0, P: 0 };
    rows.forEach(({ r }) => { have[BUCKET[r.kind || ""]] += mins(r.start, r.end); });
    if (!c.ltpc) return { c, rows, have, gap: null };
    const want = { L: c.ltpc[0], T: c.ltpc[1], P: c.ltpc[2] };
    return {
        c, rows, have, want,
        gap: { L: nominal(have.L) - want.L, T: nominal(have.T) - want.T,
               P: nominal(have.P) - want.P },
    };
}

// ---------- drawing the overlay ----------

function px(pt) { return pt * DATA[sheet].page.scale * zoom; }

function render() {
    const page = DATA[sheet].page;
    const img = $("#page");
    img.src = page.img;
    img.style.width = px(page.w) + "px";

    const layer = $("#layer");
    layer.innerHTML = "";

    live().forEach(({ i, r }) => {
        if (!r.bbox) return;                    // coordinate-read sheets have none
        const flagged = !!r.flags.length;
        if (onlyFlagged && !flagged) return;

        const b = document.createElement("div");
        b.className = "bx" + (flagged ? " flag" : "") + (r._done ? " done" : "")
            + (sel === i ? " sel" : "");
        b.style.left = px(r.bbox[0]) + "px";
        b.style.top = px(r.bbox[1]) + "px";
        b.style.width = px(r.bbox[2] - r.bbox[0]) + "px";
        b.style.height = px(r.bbox[3] - r.bbox[1]) + "px";
        // The sheet's own fill, faint, so the ink underneath stays readable.
        if (r.fill) b.style.background = r.fill + "5c";

        const tag = document.createElement("span");
        tag.className = "bx-tag";
        tag.textContent = (r.course || "?") + (r.kind ? " " + r.kind : "")
            + (r.group ? " g" + r.group : "");
        b.appendChild(tag);

        // The times printed IN the box are the point: you read the parser's
        // answer against the sheet's own printed span without looking away.
        const tm = document.createElement("span");
        tm.className = "bx-t";
        tm.textContent = `${r.start || "?"}–${r.end || "?"}`;
        b.appendChild(tm);

        b.addEventListener("click", (e) => { e.stopPropagation(); select(i); });
        layer.appendChild(b);
    });

    (store.regions[sheet] || []).forEach((rg, k) => layer.appendChild(regionEl(rg, k)));

    renderLegend();
    renderCount();
    renderInspector();
    $("#zoomLbl").textContent = Math.round(zoom * 100) + "%";
}

function regionEl(rg, k) {
    const el = document.createElement("div");
    el.className = "rg";
    el.style.left = px(rg.x0) + "px";
    el.style.top = px(rg.y0) + "px";
    el.style.width = px(rg.x1 - rg.x0) + "px";
    el.style.height = px(rg.y1 - rg.y0) + "px";
    const lb = document.createElement("span");
    lb.className = "rg-label";
    lb.textContent = rg.role + " ✕";
    lb.title = "click to remove";
    lb.addEventListener("click", (e) => {
        e.stopPropagation();
        store.regions[sheet].splice(k, 1);
        save();
        render();
    });
    el.appendChild(lb);
    return el;
}

function renderLegend() {
    const wrap = $("#legend");
    wrap.innerHTML = "";
    const declared = Object.keys(DATA[sheet].courses || {});
    const seen = [...new Set(live().map(({ r }) => r.course).filter(Boolean))];
    const codes = declared.concat(seen.filter((c) => !declared.includes(c)));

    codes.forEach((code) => {
        const { c, rows, gap } = reconcile(code);
        const bad = gap && (gap.L || gap.T || gap.P);
        const el = document.createElement("span");
        el.className = "lg" + (bad ? " bad" : "");
        const sw = document.createElement("span");
        sw.className = "sw";
        sw.style.background = (rows.find(({ r }) => r.fill) || { r: {} }).r.fill || "#ccc";
        el.appendChild(sw);
        const txt = document.createElement("span");
        // The one line that answers "does this course have a lab, a tutorial,
        // a group split" -- straight off the credit table, not the grid.
        txt.innerHTML = `<b>${code}</b> ${c.ltpc ? c.ltpc.join("-") : "?"} ` +
            (!gap ? "· no L-T-P-C"
                : bad ? "· " + ["L", "T", "P"].filter((k) => gap[k])
                    .map((k) => `${gap[k] > 0 ? "+" : ""}${gap[k]}${k}`).join(" ")
                : "· ok");
        el.appendChild(txt);
        el.title = c.title || "";
        // Clicking a course jumps to its first block on the page.
        el.addEventListener("click", () => {
            const first = rows[0];
            if (!first) return;
            select(first.i);
            document.querySelector(".bx.sel")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        wrap.appendChild(el);
    });
}

function renderCount() {
    const all = live();
    const flagged = all.filter(({ r }) => r.flags.length).length;
    const done = all.filter(({ r }) => r._done).length;
    $("#count").textContent =
        `${done}/${all.length} checked · ${flagged} flagged`;
}

// ---------- the inspector ----------

function select(i) { sel = i; render(); }

function renderInspector() {
    const box = $("#insp");
    if (sel == null) { box.hidden = true; return; }
    box.hidden = false;
    const r = rowOf(sel);

    box.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = r.course || "no course code";
    box.appendChild(h);

    const g = document.createElement("div");
    g.className = "g";

    const add = (label, el) => {
        const l = document.createElement("label");
        l.textContent = label;
        g.appendChild(l);
        g.appendChild(el);
    };

    const inp = (val, field, upper) => {
        const el = document.createElement("input");
        el.value = val == null ? "" : val;
        el.spellcheck = false;
        el.addEventListener("change", () => {
            let v = el.value.trim() || null;
            if (v && upper) v = v.toUpperCase();
            setField(sel, field, v);
            render();
        });
        return el;
    };

    const pick = (val, opts, field, label) => {
        const el = document.createElement("select");
        opts.forEach((o) => {
            const opt = document.createElement("option");
            opt.value = o;
            opt.textContent = label ? label(o) : (o || "—");
            el.appendChild(opt);
        });
        el.value = val || "";
        el.addEventListener("change", () => { setField(sel, field, el.value || null); render(); });
        return el;
    };

    add("day", pick(r.day, [""].concat(DAYS), "day"));
    add("start", inp(r.start, "start"));
    add("end", inp(r.end, "end"));
    add("course", inp(r.course, "course", true));
    add("room", inp(r.room, "room", true));
    add("kind", pick(r.kind || "", KINDS, "kind", (k) => KIND_LABEL[k]));
    const grp = document.createElement("input");
    grp.value = r.group == null ? "" : r.group;
    grp.addEventListener("change", () => {
        setField(sel, "group", grp.value ? Number(grp.value) : 0);
        render();
    });
    add("group", grp);
    box.appendChild(g);

    if (r.flags.length) {
        const w = document.createElement("p");
        w.className = "why";
        w.textContent = "⚠ " + r.flags.join(" · ");
        box.appendChild(w);
    }
    const raw = document.createElement("p");
    raw.className = "raw";
    raw.textContent = `sheet: ${r.raw || "(nothing)"}`
        + (r.time_from ? ` · time ${r.time_from}` : "")
        + (r.kind_from ? ` · kind ${r.kind_from}` : "");
    box.appendChild(raw);

    const acts = document.createElement("div");
    acts.className = "acts";
    const ok = document.createElement("button");
    ok.className = "ok";
    ok.textContent = r._done ? "✓ checked" : "mark checked";
    ok.addEventListener("click", () => { setField(sel, "_done", !r._done); render(); });
    const rm = document.createElement("button");
    rm.className = "rm";
    rm.textContent = "not a class";
    rm.addEventListener("click", () => { setField(sel, "_cut", true); sel = null; render(); });
    const cl = document.createElement("button");
    cl.textContent = "close";
    cl.addEventListener("click", () => { sel = null; render(); });
    acts.append(ok, rm, cl);
    box.appendChild(acts);
}

// ---------- regions ----------
//
// Telling the parser WHERE the week grid and the course table are, instead
// of it inferring both from headers. On the sheets where that inference
// fails it fails silently, and a region is a fact a human can state in two
// seconds. Exported alongside the parse so the tool can consume it.

function bindRegionDrawing() {
    const stage = $("#stage");
    let start = null, ghost = null;

    stage.addEventListener("mousedown", (e) => {
        if (!drawing) return;
        e.preventDefault();
        const box = stage.getBoundingClientRect();
        start = { x: e.clientX - box.left, y: e.clientY - box.top };
        ghost = document.createElement("div");
        ghost.className = "rg";
        $("#layer").appendChild(ghost);
    });

    stage.addEventListener("mousemove", (e) => {
        if (!start || !ghost) return;
        const box = stage.getBoundingClientRect();
        const x = e.clientX - box.left, y = e.clientY - box.top;
        ghost.style.left = Math.min(start.x, x) + "px";
        ghost.style.top = Math.min(start.y, y) + "px";
        ghost.style.width = Math.abs(x - start.x) + "px";
        ghost.style.height = Math.abs(y - start.y) + "px";
    });

    window.addEventListener("mouseup", (e) => {
        if (!start) return;
        const box = stage.getBoundingClientRect();
        const x = e.clientX - box.left, y = e.clientY - box.top;
        const k = DATA[sheet].page.scale * zoom;
        // Stored in PAGE POINTS, not screen pixels, so a region survives a
        // zoom change and means the same thing to the Python side.
        const rg = {
            role: drawing,
            x0: Math.min(start.x, x) / k, y0: Math.min(start.y, y) / k,
            x1: Math.max(start.x, x) / k, y1: Math.max(start.y, y) / k,
        };
        start = null;
        ghost = null;
        setDrawing(null);
        if ((rg.x1 - rg.x0) < 8 || (rg.y1 - rg.y0) < 8) { render(); return; }
        (store.regions[sheet] = store.regions[sheet] || []).push(rg);
        save();
        render();
    });

    $("#stage").addEventListener("click", () => { if (!drawing) { sel = null; render(); } });
}

function setDrawing(role) {
    drawing = role;
    $("#stage").classList.toggle("drawing", !!role);
    $("#drawGrid").classList.toggle("on", role === "grid");
    $("#drawCourses").classList.toggle("on", role === "courses");
}

// ---------- export ----------

function exportWeek() {
    const rows = live().filter(({ r }) => r.day && r.start && r.end && r.course).map(({ r }) => r);
    const bad = live().filter(({ r }) => !(r.day && r.start && r.end && r.course)).map(({ r }) => r);
    const byDay = {};
    rows.forEach((r) => (byDay[r.day] = byDay[r.day] || []).push(r));

    let out = `// ${sheet}\n// ${rows.length} blocks\n`;
    const un = live().filter(({ r }) => !r._done).length;
    if (un) out += `// ${un} block(s) NOT yet checked against the sheet\n`;
    out += "const WEEK = {\n";
    DAYS.forEach((d) => {
        const list = (byDay[d] || []).sort((a, b) => a.start.localeCompare(b.start));
        if (!list.length) return;
        out += `    ${DAY_NO[d]}: [ // ${d}\n`;
        list.forEach((r) => {
            out += `        ["${r.start}", "${r.end}", "${r.course}", "${r.room || ""}", `
                + `"${r.kind || ""}", ${r.group || 0}],\n`;
        });
        out += "    ],\n";
    });
    out += "};\n";
    if (bad.length) {
        out += `\n// ${bad.length} block(s) not exported — missing day/time/course:\n`;
        bad.forEach((r) => { out += `//   ${r.day || "?"} ${r.start || "?"}-${r.end || "?"} `
            + `${r.course || "?"}   sheet: ${r.raw}\n`; });
    }
    if (store.regions[sheet]?.length) {
        out += `\n// regions marked on this sheet (page points), for the parser:\n// `
            + JSON.stringify(store.regions[sheet]) + "\n";
    }
    $("#out").value = out;
    $("#out").closest("details").open = true;
}

// ---------- boot ----------

function pick(name) {
    sheet = name;
    sel = null;
    localStorage.setItem(KEY + ".sheet", name);
    render();
}

async function boot() {
    load();
    try {
        const res = await fetch(SRC);
        DATA = await res.json();
    } catch (e) {
        document.body.insertAdjacentHTML("beforeend",
            `<p style="padding:20px">Could not load ${SRC} — run `
            + `<code>python3 tools/parse_timetable.py -o ${SRC}</code> and serve over http.</p>`);
        return;
    }

    const s = $("#sheet");
    Object.keys(DATA).sort().reverse().forEach((n) => {
        const o = document.createElement("option");
        o.value = n;
        o.textContent = `${n}  (${DATA[n].blocks.length} blocks, `
            + `${DATA[n].blocks.filter((b) => !b.ok).length} flagged)`;
        s.appendChild(o);
    });
    s.addEventListener("change", () => pick(s.value));
    const last = localStorage.getItem(KEY + ".sheet");
    const pref = Object.keys(DATA).sort().reverse()
        .find((n) => n.includes("year3-sem5-btech-cse"));
    s.value = DATA[last] ? last : (pref || s.options[0].value);

    $("#zoomIn").addEventListener("click", () => { zoom = Math.min(3, zoom + 0.15); render(); });
    $("#zoomOut").addEventListener("click", () => { zoom = Math.max(0.4, zoom - 0.15); render(); });
    $("#drawGrid").addEventListener("click", () => setDrawing(drawing === "grid" ? null : "grid"));
    $("#drawCourses").addEventListener("click",
        () => setDrawing(drawing === "courses" ? null : "courses"));
    $("#hideOk").addEventListener("click", () => {
        onlyFlagged = !onlyFlagged;
        $("#hideOk").classList.toggle("on", onlyFlagged);
        render();
    });
    $("#zero").addEventListener("click", () => {
        DATA[sheet].blocks.forEach((_, i) => setField(i, "group", 0));
        render();
    });
    $("#export").addEventListener("click", exportWeek);

    document.addEventListener("keydown", (e) => {
        if (e.target.matches("input, select, textarea")) return;
        if (e.key === "Escape") { sel = null; setDrawing(null); render(); }
    });

    bindRegionDrawing();
    pick(s.value);
}

boot();

$("#theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
});
