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
let focusCourse = null;      // review one course at a time
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
        // Focus mode keeps the other courses on screen but faded, rather
        // than hiding them. You still need to see that the slot next door
        // is taken -- a course reviewed in a vacuum is how a clash gets
        // through -- but only one course is live to click and step through.
        const off = focusCourse && r.course !== focusCourse;

        const b = document.createElement("div");
        b.className = "bx" + (flagged ? " flag" : "") + (r._done ? " done" : "")
            + (sel === i ? " sel" : "") + (off ? " off" : "");
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
        el.className = "lg" + (bad ? " bad" : "")
            + (focusCourse === code ? " on" : "")
            + (focusCourse && focusCourse !== code ? " dim" : "");
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
        // Clicking a course focuses it: the review goes course by course,
        // which is the order the credit table can actually check.
        el.addEventListener("click", () => focus(code === focusCourse ? null : code));
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

function focus(code) {
    focusCourse = code;
    sel = null;
    render();
    if (!code) return;
    const first = ordered().find(({ r }) => r.course === code);
    if (first) {
        select(first.i);
        document.querySelector(".bx.sel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// Courses in the order the legend shows them, so [ and ] walk the same
// list you are looking at.
function courseList() {
    const declared = Object.keys(DATA[sheet].courses || {});
    const seen = [...new Set(live().map(({ r }) => r.course).filter(Boolean))];
    return declared.concat(seen.filter((c) => !declared.includes(c)));
}

function stepCourse(delta) {
    const list = courseList();
    if (!list.length) return;
    const at = list.indexOf(focusCourse);
    focus(list[(at + delta + list.length) % list.length]);
}

// ---------- keyboard ----------
//
// The review is a sweep, not a form. Every action that moves it forward is
// one key with a hand resting on the keyboard: step to the next block that
// needs a decision, say what it is, move on. Reaching for the mouse per
// field is what made the last version unusable.

// Blocks in reading order, which is the order you check them in.
function ordered() {
    return live()
        .filter(({ r }) => r.bbox && (!focusCourse || r.course === focusCourse))
        .sort((a, b) => (a.r.bbox[1] - b.r.bbox[1]) || (a.r.bbox[0] - b.r.bbox[0]));
}

function step(delta, flaggedOnly) {
    let list = ordered();
    if (flaggedOnly) {
        const need = list.filter(({ r }) => r.flags.length && !r._done);
        if (need.length) list = need;
    }
    if (!list.length) return;
    const at = list.findIndex(({ i }) => i === sel);
    const next = at < 0 ? (delta > 0 ? 0 : list.length - 1)
        : (at + delta + list.length) % list.length;
    select(list[next].i);
    document.querySelector(".bx.sel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function checkAll() {
    const list = live();
    if (!confirm(`Mark all ${list.length} blocks on this sheet as checked?`)) return;
    list.forEach(({ i }) => setField(i, "_done", true));
    render();
}

function keys(e) {
    // e.target is the document itself when nothing is focused, and
    // Document has no .matches -- checking it directly threw on every
    // keypress and killed the shortcuts silently.
    const el = e.target instanceof Element ? e.target : null;
    if (el && el.matches("input, select, textarea")) {
        if (e.key === "Escape") el.blur();
        return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key;
    const nav = {
        j: 1, ArrowDown: 1, ArrowRight: 1,
        k: -1, ArrowUp: -1, ArrowLeft: -1,
    };
    if (k in nav) { e.preventDefault(); step(nav[k], false); return; }
    if (k === "n") { e.preventDefault(); step(1, true); return; }
    if (k === "N") { e.preventDefault(); step(-1, true); return; }
    if (k === "Escape") { sel = null; setDrawing(null); render(); return; }
    if (k === "A") { e.preventDefault(); checkAll(); return; }
    if (k === "E") { e.preventDefault(); exportWeek(); return; }
    if (k === "?") { $("#keys").hidden = !$("#keys").hidden; return; }
    if (k === "]") { e.preventDefault(); stepCourse(1); return; }
    if (k === "[") { e.preventDefault(); stepCourse(-1); return; }
    if (k === "a") { e.preventDefault(); focus(null); return; }
    if (k === "C" && focusCourse) {
        e.preventDefault();
        ordered().forEach(({ i }) => setField(i, "_done", true));
        render();
        return;
    }
    if (k === "f") {
        onlyFlagged = !onlyFlagged;
        $("#hideOk").classList.toggle("on", onlyFlagged);
        render();
        return;
    }

    if (sel == null) return;
    e.preventDefault();
    const r = rowOf(sel);

    // Check-and-advance: the sweep should not need two keys per block.
    if (k === "c" || k === "Enter" || k === " ") {
        setField(sel, "_done", !r._done);
        render();
        step(1, onlyFlagged);
        return;
    }
    if (k === "x") { setField(sel, "_cut", true); sel = null; render(); step(1, onlyFlagged); return; }
    const kind = { e: "", t: "tut", l: "lab", p: "proj" };
    if (k in kind) { setField(sel, "kind", kind[k]); render(); return; }
    if ("0123".includes(k)) { setField(sel, "group", Number(k)); render(); return; }
    if (k === "s") { $("#insp input")?.focus(); return; }
}

// ---------- export ----------

function exportWeek() {
    const rows = live().filter(({ r }) => r.day && r.start && r.end && r.course).map(({ r }) => r);
    const bad = live().filter(({ r }) => !(r.day && r.start && r.end && r.course)).map(({ r }) => r);
    const byDay = {};
    rows.forEach((r) => (byDay[r.day] = byDay[r.day] || []).push(r));

    let out = `// ${sheet}\n// ${rows.length} blocks\n`;
    // Checking is a bookkeeping aid for a long sweep, never a gate. Export
    // always emits everything; the count is a note, not a blocker.
    const un = live().filter(({ r }) => !r._done).length;
    if (un) out += `// ${un} block(s) not ticked as checked (exported anyway)\n`;
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

    $("#checkAll").addEventListener("click", checkAll);
    $("#help").addEventListener("click", () => $("#keys").hidden = !$("#keys").hidden);
    document.addEventListener("keydown", keys);

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
