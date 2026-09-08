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
// THE DEFAULT VIEW IS COURSES, NOT ROWS. Checking 34 rows one at a time
// is the wrong shape of work: it asks "is this row right?" 34 times and
// gives you no way to know when you are done. The sheet's L-T-P-C table
// answers a better question per course -- does this course have a lab, a
// tutorial, a group split, and how many hours of each -- and it is the
// half of the document the grid was NOT transcribed from, so it is a real
// check rather than a second reading. Seven cards, each either reconciled
// or short by a stated amount. That is the whole review.
//
// Same shape as planedit.html, which does this for the floor plans:
// machine first pass, hand-fix, export a block to paste back.
// ============================================================

// A 50-minute period is one nominal contact hour, which is how L-T-P-C
// counts. Same constant as tools/check_timetable.py -- keep them equal.
const MIN_PER_HOUR = 50;
const BUCKET = { "": "L", tut: "T", lab: "P", proj: "P" };
const KIND_LABEL = { "": "lecture", tut: "tutorial", lab: "lab", proj: "project" };

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
let view = "courses";

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

// ---------- reconciliation ----------

function mins(a, b) {
    if (!a || !b) return 0;
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return (bh * 60 + bm) - (ah * 60 + am);
}

const nominal = (m) => Math.round(m / MIN_PER_HOUR);

const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 || ""}`.trim() : `${m}m`);

// Every live row for this sheet, with its index kept so edits still address
// the original block.
function liveRows() {
    return DATA[sheet].blocks
        .map((_, i) => ({ i, r: rowOf(i) }))
        .filter(({ r }) => !r._cut);
}

// What the sheet's OWN course table demands, against what the grid gave us.
// The gap is the finding: a course short on practical hours has a lab
// nobody transcribed, and a course over is a block wearing the wrong kind.
function reconcile(code) {
    const course = (DATA[sheet].courses || {})[code] || {};
    const rows = liveRows().filter(({ r }) => r.course === code);
    const have = { L: 0, T: 0, P: 0 };
    rows.forEach(({ r }) => { have[BUCKET[r.kind || ""]] += mins(r.start, r.end); });

    const want = course.ltpc
        ? { L: course.ltpc[0], T: course.ltpc[1], P: course.ltpc[2] }
        : null;

    const groups = new Set(rows.map(({ r }) => r.group).filter(Boolean));
    return {
        course, rows, have, want, groups,
        gap: want ? { L: nominal(have.L) - want.L, T: nominal(have.T) - want.T,
                      P: nominal(have.P) - want.P } : null,
    };
}

// ---------- rendering ----------

function render() {
    $("#courses").hidden = view !== "courses";
    $("#rowsWrap").hidden = view !== "rows";
    $("#tabCourses").classList.toggle("on", view === "courses");
    $("#tabRows").classList.toggle("on", view === "rows");
    if (view === "courses") renderCourses(); else renderRows();
    renderCount();
}

function renderCount() {
    const blocks = DATA[sheet].blocks;
    const done = blocks.filter((_, i) => rowOf(i)._done).length;
    const flagged = blocks.filter((_, i) => rowOf(i).flags.length).length;
    const cut = blocks.filter((_, i) => rowOf(i)._cut).length;
    $("#count").innerHTML =
        `<b>${done}</b>/${blocks.length - cut} checked · ${flagged} flagged` +
        (cut ? ` · ${cut} dropped` : "");
}

// ---------- courses view ----------

function chip(text, tone) {
    const s = document.createElement("span");
    s.className = "chip" + (tone ? " chip-" + tone : "");
    s.textContent = text;
    return s;
}

function renderCourses() {
    const wrap = $("#courses");
    wrap.innerHTML = "";

    const declared = Object.keys(DATA[sheet].courses || {});
    const seen = [...new Set(liveRows().map(({ r }) => r.course).filter(Boolean))];
    // Declared first, in the sheet's own order, then anything the grid has
    // that the course table does not. A course in the grid and not in the
    // table is worth seeing, not hiding.
    const codes = declared.concat(seen.filter((c) => !declared.includes(c)));

    if (!declared.length) {
        const p = document.createElement("p");
        p.className = "ed-warn";
        p.textContent = "This sheet carries no L-T-P-C course table, so there is "
            + "nothing independent to reconcile the grid against. Courses below are "
            + "read off the grid itself and only tell you what was found, not what "
            + "should be there.";
        wrap.appendChild(p);
    }

    codes.forEach((code) => wrap.appendChild(courseCard(code)));

    // Blocks with no course code at all: reserved slots, lunch, free text.
    const loose = liveRows().filter(({ r }) => !r.course);
    if (loose.length) wrap.appendChild(looseCard(loose));
}

function courseCard(code) {
    const { course, rows, have, want, groups, gap } = reconcile(code);

    const card = document.createElement("section");
    card.className = "cc";

    const bad = gap && (gap.L || gap.T || gap.P);
    if (bad) card.classList.add("cc-bad");

    const head = document.createElement("header");
    head.className = "cc-head";
    head.innerHTML =
        `<span class="cc-code">${code}</span>` +
        `<span class="cc-ltpc">${course.ltpc ? course.ltpc.join("-") : "no L-T-P-C"}</span>` +
        `<span class="cc-title">${course.title || "(not in the course table)"}</span>`;
    const verdict = document.createElement("span");
    verdict.className = "cc-verdict " + (bad ? "bad" : "good");
    verdict.textContent = !gap ? "cannot check"
        : bad ? ["L", "T", "P"].filter((k) => gap[k])
            .map((k) => `${gap[k] > 0 ? "+" : ""}${gap[k]}h ${k}`).join(" · ")
        : "reconciled";
    head.appendChild(verdict);
    card.appendChild(head);

    if (course.faculty) {
        const f = document.createElement("p");
        f.className = "cc-fac";
        f.textContent = course.faculty;
        card.appendChild(f);
    }

    // The line that answers the actual question: does this course have a
    // lab, a tutorial, a group component.
    const bar = document.createElement("div");
    bar.className = "cc-bar";
    [["L", "lecture"], ["T", "tutorial"], ["P", "lab/proj"]].forEach(([k, label]) => {
        const w = want ? want[k] : null;
        const h = nominal(have[k]);
        if (!w && !h) return;
        const tone = !want ? "" : (h === w ? "good" : "bad");
        bar.appendChild(chip(`${label} ${w === null ? "" : w + "h needed · "}${h}h found`, tone));
    });
    bar.appendChild(chip(groups.size
        ? `split into ${groups.size} group${groups.size > 1 ? "s" : ""}`
        : "no group split", groups.size ? "info" : ""));
    card.appendChild(bar);

    const list = document.createElement("div");
    list.className = "cc-rows";
    rows.forEach(({ i, r }) => list.appendChild(blockLine(i, r)));
    if (!rows.length) {
        const none = document.createElement("p");
        none.className = "ed-warn";
        none.textContent = "No block in the grid carries this course code.";
        list.appendChild(none);
    }
    card.appendChild(list);
    return card;
}

// One block, editable in place. Compact because the point is to scan a
// course's whole week at once, not to dwell on a row.
function blockLine(i, r) {
    const line = document.createElement("div");
    line.className = "bl" + (r.flags.length ? " bl-flag" : "") + (r._done ? " bl-done" : "");

    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.checked = !!r._done;
    tick.title = "checked against the sheet";
    tick.addEventListener("change", () => { setField(i, "_done", tick.checked); render(); });
    line.appendChild(tick);

    line.appendChild(picker(r.day, [""].concat(DAYS), (v) => { setField(i, "day", v); render(); }));
    line.appendChild(input(r.start, (v) => { setField(i, "start", v); render(); }, null, "t"));
    line.appendChild(input(r.end, (v) => { setField(i, "end", v); render(); }, null, "t"));
    line.appendChild(input(r.room, (v) => setField(i, "room", v ? v.toUpperCase() : null), null, "r"));
    line.appendChild(picker(r.kind || "", KINDS, (v) => { setField(i, "kind", v); render(); },
        (k) => KIND_LABEL[k]));
    line.appendChild(input(r.group == null ? "" : r.group,
        (v) => { setField(i, "group", v ? Number(v) : 0); render(); }, "grp", "g"));

    const dur = document.createElement("span");
    dur.className = "bl-dur";
    dur.textContent = r.start && r.end ? fmt(mins(r.start, r.end)) : "";
    line.appendChild(dur);

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.title = "not a class — drop it";
    del.className = "bl-del";
    del.addEventListener("click", () => { setField(i, "_cut", true); render(); });
    line.appendChild(del);

    const evi = document.createElement("p");
    evi.className = "bl-evi";
    evi.textContent = (r.flags.length ? "⚠ " + r.flags.join(" · ") + "   —   " : "")
        + `sheet: ${r.raw || "(nothing)"}`
        + (r.time_from ? `   ·   time ${r.time_from}` : "")
        + (r.kind_from ? `   ·   kind ${r.kind_from}` : "");
    line.appendChild(evi);
    return line;
}

function looseCard(loose) {
    const card = document.createElement("section");
    card.className = "cc cc-loose";
    const head = document.createElement("header");
    head.className = "cc-head";
    head.innerHTML = `<span class="cc-code">no course code</span>`
        + `<span class="cc-title">reserved slots, lunch, free text. Drop them or `
        + `give them a course.</span>`;
    head.appendChild(chip(`${loose.length} block${loose.length > 1 ? "s" : ""}`, "info"));
    card.appendChild(head);
    const list = document.createElement("div");
    list.className = "cc-rows";
    loose.forEach(({ i, r }) => {
        const line = blockLine(i, r);
        const c = input(r.course, (v) => { setField(i, "course", v ? v.toUpperCase() : null); render(); },
            null, "c");
        c.placeholder = "code";
        line.insertBefore(c, line.querySelector(".bl-dur"));
        list.appendChild(line);
    });
    card.appendChild(list);
    return card;
}

// ---------- rows view (the escape hatch) ----------

function renderRows() {
    const blocks = DATA[sheet].blocks;
    const body = $("#rows");
    body.innerHTML = "";
    blocks.forEach((_, i) => {
        const r = rowOf(i);
        if (r._cut) return;
        if (onlyFlagged && !r.flags.length && !r._done) return;
        body.appendChild(renderRow(i, r));
    });
}

function cell(row, cls, node) {
    const td = document.createElement("td");
    if (cls) td.className = cls;
    td.appendChild(node);
    row.appendChild(td);
    return td;
}

function input(value, onchange, title, cls) {
    const el = document.createElement("input");
    el.value = value == null ? "" : value;
    el.spellcheck = false;
    if (title) el.title = title;
    if (cls) el.className = "f-" + cls;
    // change, not input: re-rendering the whole card on every keystroke
    // would steal focus mid-word.
    el.addEventListener("change", () => onchange(el.value.trim() || null));
    return el;
}

function picker(value, options, onchange, label) {
    const el = document.createElement("select");
    options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = label ? label(o) : (o === "" ? "—" : o);
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

// ---------- ingest: someone else fills the same JSON ----------
//
// The JSON is the contract, not this parser. pdfplumber is one producer;
// a model reading a screenshot of one day is another; typing is a third.
// Anything that can emit the block shape can feed this page.
//
// What makes that safe is NOT trusting the producer. A model reading a
// timetable image will return plausible, well-formatted, confidently wrong
// times -- that is its characteristic failure, and it is the exact failure
// this whole tool exists to catch. So an ingest lands in the same course
// cards and is reconciled against the same L-T-P-C table the grid was
// never transcribed from. A pasted week that balances is evidence. One
// that does not says so on the card, immediately, per course.

const SCHEMA = `[
  {"day":"Monday","start":"09:00","end":"09:50","course":"AHUL261",
   "room":"M4-1-017","kind":"tut","group":1}
]`;

function copyPrompt() {
    const courses = DATA[sheet].courses || {};
    const known = Object.entries(courses)
        .map(([c, v]) => `  ${c}  ${v.ltpc ? v.ltpc.join("-") : "?"}  ${v.title}`)
        .join("\n");

    const prompt =
`Read ONLY what is visible in this image of a university timetable grid.
Return a JSON array of the class blocks, and nothing else -- no prose, no
code fence.

Shape (one object per block):
${SCHEMA}

Rules:
- "day" is one of Monday Tuesday Wednesday Thursday Friday.
- "start"/"end" are 24h "HH:MM". If the block PRINTS its own times, use
  those exactly. Do NOT round to the column edges of the grid.
- "kind" is "" for a lecture, "tut", "lab", or "proj".
- "group" is 0 unless the block is genuinely only for one group.
- Use null for any field you cannot actually read. Do not guess, do not
  fill a value from what is typical. A null is useful; a plausible wrong
  time is not.

${known ? `Courses on this sheet (code, L-T-P-C, title):\n${known}\n` : ""}`;

    navigator.clipboard.writeText(prompt).then(() => {
        $("#out").value = prompt;
        $("#outBox").open = true;
        flash("#prompt", "copied — paste it with your screenshot");
    }, () => {
        $("#out").value = prompt;
        $("#outBox").open = true;
        flash("#prompt", "clipboard blocked — copy it from the box below");
    });
}

// Replace this sheet's blocks with a pasted array. Destructive on purpose
// and confirmed, but never unrecoverable: re-running
// tools/parse_timetable.py regenerates the original.
function ingest() {
    let arr;
    try {
        arr = JSON.parse($("#out").value.replace(/^\s*```(json)?|```\s*$/g, ""));
    } catch (e) {
        flash("#ingest", "not valid JSON: " + e.message);
        return;
    }
    if (!Array.isArray(arr) || !arr.length) {
        flash("#ingest", "expected a non-empty JSON array of blocks");
        return;
    }
    if (!confirm(`Replace all ${DATA[sheet].blocks.length} blocks for ${sheet} `
        + `with ${arr.length} pasted ones? Your ticks and edits for this sheet `
        + `are cleared. Re-run parse_timetable.py to get the original back.`)) return;

    DATA[sheet].blocks = arr.map((b) => ({
        day: b.day || null,
        group: b.group == null ? 0 : Number(b.group),
        start: b.start || null,
        end: b.end || null,
        course: b.course ? String(b.course).toUpperCase() : null,
        room: b.room ? String(b.room).toUpperCase() : null,
        kind: KINDS.includes(b.kind) ? b.kind : "",
        kind_from: "pasted",
        time_from: "pasted",
        raw: b.raw || "(pasted, no cell text)",
        // Everything pasted is unverified by definition. Flagging it keeps
        // the "only flagged" sweep meaningful instead of quietly promoting
        // a model's output to the same standing as a read cell.
        flags: ["pasted — not read from the PDF, check every field"],
        ok: false,
    }));
    delete edits[sheet];
    save();
    render();
    flash("#ingest", `ingested ${arr.length} blocks`);
}

function flash(sel, msg) {
    const el = $(sel);
    const was = el.textContent;
    el.textContent = msg;
    setTimeout(() => (el.textContent = was), 2600);
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
    $("#outBox").open = true;
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

    $("#tabCourses").addEventListener("click", () => { view = "courses"; render(); });
    $("#tabRows").addEventListener("click", () => { view = "rows"; render(); });
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
    $("#prompt").addEventListener("click", copyPrompt);
    $("#ingest").addEventListener("click", ingest);
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
