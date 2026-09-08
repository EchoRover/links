// ============================================================
// TIMETABLE EDITOR — fix the machine's first pass by hand.
//
// tools/parse_timetable.py reads every sheet in data/timetables into
// data/timetables/parsed.json. That pass is good but not right: measured
// against the hand-verified week, 19 of 23 blocks were exact and all four
// misses were end times the parser itself had flagged. So the job here is
// not "type a timetable", it is "check 11 flagged rows out of 34".
//
// Three rules this file is built around:
//
//   1. THE SHEET IS ON SCREEN. Verification means comparing against the
//      source, not against your memory of it. The PDF pane is not a
//      convenience, it is the point.
//   2. THE PARSER'S DOUBT SURVIVES. Flagged rows are marked and can be
//      filtered to. A tool that renders a guess identically to a certainty
//      hands you a clean-looking file with errors buried in it.
//   3. NOTHING IS LOST. Every keystroke goes to localStorage against the
//      sheet's name, so a reload, a crash, or coming back tomorrow resumes
//      exactly where you were. Nobody re-does this work twice.
//
// Same shape as planedit.html, which does this for the floor plans:
// machine first pass, hand-fix, export a block to paste back.
// ============================================================

const SRC = "data/timetables/parsed.json";
const PDF_DIR = "data/timetables/";
const KEY = "linkcs.ttedit.v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_NO = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

// The kinds js/timetable.js understands. "" is a plain lecture.
const KINDS = ["", "tut", "lab", "proj"];

const $ = (s) => document.querySelector(s);

let DATA = {};        // sheet name -> parsed blocks, straight from the JSON
let edits = {};       // sheet name -> row index -> {field: value, _done, _cut}
let sheet = null;
let onlyFlagged = false;

// ---------- persistence ----------

// Wrapped because localStorage throws outright in a few contexts (private
// windows, blocked site data) rather than returning null, and losing the
// editor to that would be absurd.
function load() {
    try {
        edits = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
        edits = {};
    }
}

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(edits));
    } catch (e) {
        /* out of quota or blocked; the rows on screen are still correct */
    }
}

// The edited view of a row: the parser's value unless a human replaced it.
function rowOf(i) {
    const base = DATA[sheet].blocks[i];
    const over = (edits[sheet] || {})[i] || {};
    return { ...base, ...over };
}

function setField(i, field, value) {
    edits[sheet] = edits[sheet] || {};
    edits[sheet][i] = edits[sheet][i] || {};
    edits[sheet][i][field] = value;
    save();
}

// ---------- rendering ----------

function render() {
    const blocks = DATA[sheet].blocks;
    const body = $("#rows");
    body.innerHTML = "";

    let shown = 0;
    blocks.forEach((_, i) => {
        const r = rowOf(i);
        if (r._cut) return;
        if (onlyFlagged && !r.flags.length && !r._done) return;
        shown++;
        body.appendChild(renderRow(i, r));
    });

    const done = blocks.filter((_, i) => rowOf(i)._done).length;
    const flagged = blocks.filter((_, i) => rowOf(i).flags.length).length;
    const cut = blocks.filter((_, i) => rowOf(i)._cut).length;
    $("#count").innerHTML =
        `<b>${done}</b>/${blocks.length - cut} checked · ${flagged} flagged` +
        (cut ? ` · ${cut} deleted` : "") +
        (onlyFlagged ? ` · showing ${shown}` : "");
}

function cell(row, cls, node) {
    const td = document.createElement("td");
    if (cls) td.className = cls;
    td.appendChild(node);
    row.appendChild(td);
    return td;
}

function input(value, onchange, extra) {
    const el = document.createElement("input");
    el.value = value == null ? "" : value;
    el.spellcheck = false;
    if (extra) Object.assign(el, extra);
    el.addEventListener("input", () => onchange(el.value.trim() || null));
    return el;
}

function picker(value, options, onchange) {
    const el = document.createElement("select");
    options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o === "" ? "—" : o;
        el.appendChild(opt);
    });
    el.value = value || "";
    el.addEventListener("change", () => onchange(el.value || null));
    return el;
}

function renderRow(i, r) {
    const tr = document.createElement("tr");
    tr.dataset.i = i;
    if (r.flags.length) tr.classList.add("flag");
    if (r._done) tr.classList.add("done");

    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.checked = !!r._done;
    tick.title = "checked against the sheet";
    tick.addEventListener("change", () => {
        setField(i, "_done", tick.checked);
        tr.classList.toggle("done", tick.checked);
        render();
    });
    cell(tr, "tick", tick);

    cell(tr, "", picker(r.day, [""].concat(DAYS), (v) => setField(i, "day", v)));
    cell(tr, "", input(r.group, (v) => setField(i, "group", v ? Number(v) : null)));
    cell(tr, "", input(r.start, (v) => setField(i, "start", v)));
    cell(tr, "", input(r.end, (v) => setField(i, "end", v)));
    cell(tr, "", input(r.course, (v) => setField(i, "course", v ? v.toUpperCase() : null)));
    cell(tr, "", input(r.room, (v) => setField(i, "room", v ? v.toUpperCase() : null)));
    cell(tr, "", picker(r.kind || "", KINDS, (v) => setField(i, "kind", v)));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.title = "not a class — drop this row";
    del.addEventListener("click", () => { setField(i, "_cut", true); render(); });
    cell(tr, "del", del);

    // The evidence row. The parser's flags say what it was unsure of, and
    // the PDF's own words for the cell say why, so the fix can be made
    // without hunting for the block on the sheet first.
    const eviRow = document.createElement("tr");
    if (r.flags.length) eviRow.classList.add("flag");
    if (r._done) eviRow.classList.add("done");
    const td = document.createElement("td");
    td.colSpan = 9;
    if (r.flags.length) {
        const why = document.createElement("div");
        why.className = "cell-why";
        why.textContent = "⚠ " + r.flags.join(" · ");
        td.appendChild(why);
    }
    const raw = document.createElement("div");
    raw.className = "cell-raw";
    raw.textContent = `sheet says: ${r.raw || "(nothing)"}` +
        (r.time_from ? `   ·   time ${r.time_from}` : "");
    td.appendChild(raw);
    eviRow.appendChild(td);

    const frag = document.createDocumentFragment();
    frag.appendChild(tr);
    frag.appendChild(eviRow);
    return frag;
}

// ---------- export ----------

// Emits the WEEK literal js/timetable.js already uses, so the result is
// pasted in rather than translated by hand. Rows without a day, a start,
// an end or a course cannot become a block, so they are listed as comments
// instead of being silently dropped: a row that vanishes on export is how
// a class goes missing from the site.
function exportWeek() {
    const blocks = DATA[sheet].blocks;
    const rows = blocks.map((_, i) => rowOf(i)).filter((r) => !r._cut);

    const bad = rows.filter((r) => !(r.day && r.start && r.end && r.course));
    const good = rows.filter((r) => r.day && r.start && r.end && r.course);

    const byDay = {};
    good.forEach((r) => (byDay[r.day] = byDay[r.day] || []).push(r));

    let out = `// ${sheet}\n`;
    out += `// ${good.length} blocks · exported ${new Date().toISOString().slice(0, 16).replace("T", " ")}\n`;
    const unchecked = rows.filter((r) => !r._done).length;
    if (unchecked) out += `// ${unchecked} row(s) NOT yet checked against the sheet\n`;
    const grouped = good.filter((r) => r.group).length;
    if (grouped) {
        out += `// ${grouped} block(s) marked group-specific. Confirm that is real: the\n`
            + "// sheet draws shared classes in the group 1 row too.\n";
    }
    out += "const WEEK = {\n";

    DAYS.forEach((day) => {
        const list = (byDay[day] || []).sort((a, b) => a.start.localeCompare(b.start));
        if (!list.length) return;
        out += `    ${DAY_NO[day]}: [ // ${day}\n`;
        list.forEach((r) => {
            out += `        ["${r.start}", "${r.end}", "${r.course}", "${r.room || ""}", `
                + `"${r.kind || ""}", ${r.group || 0}],\n`;
        });
        out += "    ],\n";
    });
    out += "};\n";

    if (bad.length) {
        out += `\n// ${bad.length} row(s) could not be exported — missing a day, `
            + "time or course. Fix or delete them:\n";
        bad.forEach((r) => {
            out += `//   ${r.day || "?"} ${r.start || "?"}-${r.end || "?"} `
                + `${r.course || "?"}   sheet says: ${r.raw}\n`;
        });
    }

    $("#out").value = out;
    $("#out").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- keyboard ----------

// Enter moves DOWN the same column rather than submitting, because this is
// checked column by column: every start time, then every room. Tab already
// moves across, so between the two the whole grid is reachable without
// touching the mouse.
function bindKeys() {
    $("#rows").addEventListener("keydown", (e) => {
        const el = e.target;
        if (!(el.tagName === "INPUT" || el.tagName === "SELECT")) return;

        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            const tr = el.closest("tr");
            const box = tr.querySelector('input[type="checkbox"]');
            if (box) { box.checked = !box.checked; box.dispatchEvent(new Event("change")); }
            return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();

        const tr = el.closest("tr");
        const col = Array.from(tr.children).indexOf(el.closest("td"));
        let next = tr.nextElementSibling;
        while (next && !next.children[col]) next = next.nextElementSibling;
        const target = next && next.children[col]
            && next.children[col].querySelector("input, select");
        if (target) { target.focus(); target.select?.(); }
    });
}

// ---------- boot ----------

function pickSheet(name) {
    sheet = name;
    // The PDF sits beside the rows for the whole session; see the comment
    // at the top of ttedit.html for why that is not optional.
    // Hide the viewer's own thumbnail rail and toolbar and fit to width.
    // Left at defaults the sidebar eats a third of an already half-width
    // pane and the sheet renders at 45%, which is not readable, which
    // defeats the entire reason the PDF is here.
    $("#pdf").src = PDF_DIR + encodeURIComponent(name)
        + "#toolbar=0&navpanes=0&scrollbar=1&view=FitH";
    localStorage.setItem(KEY + ".sheet", name);
    render();
}

async function boot() {
    load();

    let res;
    try {
        res = await fetch(SRC);
        if (!res.ok) throw new Error(res.status);
        DATA = await res.json();
    } catch (e) {
        $("#rows").innerHTML = `<tr><td colspan="9" style="padding:20px">`
            + `Could not load <code>${SRC}</code> (${e.message}). Run: `
            + `<code>python3 tools/parse_timetable.py -o ${SRC}</code>, and open this `
            + `page over http (a file:// page cannot fetch).</td></tr>`;
        return;
    }

    const sel = $("#sheet");
    // Newest revision first: that is the one being transcribed.
    Object.keys(DATA).sort().reverse().forEach((name) => {
        const o = document.createElement("option");
        const b = DATA[name].blocks;
        o.value = name;
        o.textContent = `${name}  (${b.length} blocks, ${b.filter((x) => !x.ok).length} flagged)`;
        sel.appendChild(o);
    });
    sel.addEventListener("change", () => pickSheet(sel.value));

    // Default to the newest Year 3 CSE sheet: it is the one js/timetable.js
    // is built from, so it is the sheet that actually ships.
    const last = localStorage.getItem(KEY + ".sheet");
    const preferred = Object.keys(DATA).sort().reverse()
        .find((n) => n.includes("year3-sem5-btech-cse"));
    sel.value = DATA[last] ? last : (preferred || sel.options[0].value);
    pickSheet(sel.value);

    $("#only").addEventListener("click", () => {
        onlyFlagged = !onlyFlagged;
        $("#only").classList.toggle("on", onlyFlagged);
        render();
    });
    // The sheet draws a class in ONE group row even when it applies to
    // everyone -- on the Y3 CSE sheet only the four HUL tutorials are
    // genuinely group-specific, and the rest just happen to be drawn in the
    // group 1 band. No geometry distinguishes those two cases, so the
    // parser must not guess: exporting the row number would quietly give
    // every group 2 student an almost empty week. Zero them in one click,
    // then set the handful that are real.
    $("#zero").addEventListener("click", () => {
        DATA[sheet].blocks.forEach((_, i) => setField(i, "group", 0));
        render();
    });
    $("#export").addEventListener("click", exportWeek);
    $("#reset").addEventListener("click", () => {
        // Deliberately per-sheet and deliberately confirmed: this is the one
        // button here that can destroy work that exists nowhere else.
        if (!confirm(`Discard every edit for ${sheet}?`)) return;
        delete edits[sheet];
        save();
        render();
    });

    bindKeys();
}

boot();

const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const next = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
    });
}
