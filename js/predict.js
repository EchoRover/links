// ============================================================
// /predict — the Question Prediction Machine, human powered: put your name
// on which 2 problems the ACOL351 tutorial quiz asks.
//
// Each week: add the round to ROUNDS in api/bets.js (id, count, close time)
// and point ROUND below at it with the sheet's short titles. After the quiz,
// set ROUND.answer to the two problem numbers and push; the board then marks
// who called both and who called one.
// ============================================================

const ROUND = {
  id: "acol351-tut5",
  label: "ACOL351 · Tutorial 5 quiz · Wed 7 Oct",
  // Problems 12 and 13 are starred on the sheet: never asked, so not predictable.
  questions: [
    "Bottleneck paths (modify Dijkstra)",
    "One free edge (the voucher)",
    "Most reliable path",
    "Longest path: Dijkstra? and on a DAG",
    "Max lateness: which greedy works",
    "Total lateness instead",
    "Interval scheduling: which greedy works",
    "Degree sequence to a simple graph",
    "Coins 1, 2, 4, …, 2^1000: is greedy right",
    "Fair split, identical values",
    "Fair split with negative values",
  ],
  answer: null, // e.g. [3, 7] once the quiz is out
};

const API = "/api/bets";
const MINE = `bet:${ROUND.id}`;

let picks = [];
let state = { closes: null, closed: false, bets: [] };

const $ = (id) => document.getElementById(id);

function readMine() {
  try { return JSON.parse(localStorage.getItem(MINE) || "null"); } catch { return null; }
}
function saveMine(bet) {
  try { localStorage.setItem(MINE, JSON.stringify(bet)); } catch { /* private window */ }
}

function hits(bet) {
  if (!ROUND.answer) return null;
  return bet.picks.filter((p) => ROUND.answer.includes(p)).length;
}

function renderPicker() {
  const box = $("bt-qs");
  box.innerHTML = "";
  const counts = new Array(ROUND.questions.length + 1).fill(0);
  state.bets.forEach((b) => b.picks.forEach((p) => counts[p]++));
  const most = Math.max(1, ...counts);
  const locked = state.closed || readMine();

  ROUND.questions.forEach((title, i) => {
    const n = i + 1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bt-q";
    if (picks.includes(n)) btn.classList.add("on");
    if (ROUND.answer && ROUND.answer.includes(n)) btn.classList.add("asked");
    btn.disabled = Boolean(locked);
    btn.innerHTML = `
      <span class="bt-n">Q${n}</span>
      <span class="bt-t"></span>
      <span class="bt-bar"><i style="width:${(counts[n] / most) * 100}%"></i></span>
      <span class="bt-c">${counts[n] || ""}</span>`;
    btn.querySelector(".bt-t").textContent = title;
    btn.addEventListener("click", () => {
      if (picks.includes(n)) picks = picks.filter((p) => p !== n);
      else picks = [...picks, n].slice(-2); // a third tap drops the oldest
      renderPicker();
      renderForm();
    });
    box.appendChild(btn);
  });
}

function renderForm() {
  const mine = readMine();
  const form = $("bt-form");
  const note = $("bt-note");
  if (ROUND.answer) {
    form.hidden = true;
    note.textContent = `Asked: Q${ROUND.answer[0]} and Q${ROUND.answer[1]}.`;
    return;
  }
  if (mine) {
    form.hidden = true;
    note.textContent = `You're in: Q${mine.picks[0]} + Q${mine.picks[1]} as ${mine.name}.`;
    return;
  }
  if (state.closed) {
    form.hidden = true;
    note.textContent = "Predictions closed. Waiting on the quiz.";
    return;
  }
  form.hidden = false;
  const name = $("bt-name").value.trim();
  $("bt-go").disabled = !(name && picks.length === 2);
  note.textContent = picks.length === 2
    ? `Q${picks[0]} + Q${picks[1]}`
    : `Pick ${2 - picks.length} more.`;
}

function renderBoard() {
  const list = $("bt-list");
  list.innerHTML = "";
  $("bt-count").textContent = state.bets.length
    ? `${state.bets.length} prediction${state.bets.length === 1 ? "" : "s"}`
    : "no predictions yet";

  const rows = [...state.bets];
  if (ROUND.answer) rows.sort((a, b) => hits(b) - hits(a));
  rows.forEach((b) => {
    const li = document.createElement("li");
    const h = hits(b);
    if (h === 2) li.className = "won";
    else if (h === 1) li.className = "half";
    const t = new Date(b.at);
    li.innerHTML = `<span class="bt-who"></span>
      <span class="bt-pair">Q${b.picks[0]} + Q${b.picks[1]}</span>
      <span class="bt-at">${h === 2 ? "called it" : h === 1 ? "1 of 2" :
        t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`;
    li.querySelector(".bt-who").textContent = b.name;
    list.appendChild(li);
  });
}

function tick() {
  const el = $("bt-clock");
  if (!state.closes) return;
  const left = Date.parse(state.closes) - Date.now();
  if (left <= 0) {
    el.textContent = "closed";
    if (!state.closed) { state.closed = true; renderPicker(); renderForm(); }
    return;
  }
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  el.textContent = `closes in ${m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(s).padStart(2, "0")}s`}`;
}

async function load() {
  try {
    const r = await fetch(`${API}?round=${ROUND.id}`, { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    state = j;
    $("bt-err").textContent = "";
  } catch (e) {
    $("bt-err").textContent = "Can't reach the board right now.";
  }
  renderPicker();
  renderForm();
  renderBoard();
  tick();
}

// Model answers come from /api/answers, which withholds them while the
// quiz is running, so a closed dropdown here really is empty.
async function loadAnswers() {
  const box = $("bt-ans");
  const note = $("bt-ans-note");
  let j;
  try {
    j = await (await fetch(`/api/answers?round=${ROUND.id}`, { cache: "no-store" })).json();
  } catch {
    note.textContent = "can't load";
    return;
  }
  if (j.hidden) {
    const until = new Date(j.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    note.textContent = `hidden during the quiz, back at ${until}`;
    box.innerHTML = "";
    return;
  }
  if (!j.ok || box.children.length) return; // already shown: keep open dropdowns open
  note.textContent = "";
  j.answers.forEach((a) => {
    const d = document.createElement("details");
    d.className = "bt-a";
    d.innerHTML = `<summary><span class="bt-n">Q${a.q}</span><span></span></summary>
      <div class="bt-a-body">
        <p class="bt-verdict"></p>
        <p><b>Idea</b><span class="i"></span></p>
        <pre></pre>
        <p><b>Why</b><span class="w"></span></p>
        <p class="t"><b>Time</b><span></span></p>
      </div>`;
    d.querySelector("summary span:nth-child(2)").textContent = ROUND.questions[a.q - 1];
    d.querySelector(".bt-verdict").textContent = a.verdict;
    d.querySelector(".i").textContent = a.idea;
    d.querySelector("pre").textContent = a.code;
    d.querySelector(".w").textContent = a.why;
    if (a.time) d.querySelector(".t span").textContent = a.time;
    else d.querySelector(".t").remove();
    box.appendChild(d);
  });
}

async function place(ev) {
  ev.preventDefault();
  const name = $("bt-name").value.trim();
  if (!name || picks.length !== 2) return;
  $("bt-go").disabled = true;
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round: ROUND.id, name, picks }),
    });
    const j = await r.json();
    if (!j.ok) {
      $("bt-err").textContent = j.error;
      renderForm();
      return;
    }
    saveMine(j.bet);
    picks = j.bet.picks;
  } catch {
    $("bt-err").textContent = "Didn't go through. Try again.";
  }
  load();
}

document.addEventListener("DOMContentLoaded", () => {
  $("bt-label").textContent = ROUND.label;
  const mine = readMine();
  if (mine) picks = mine.picks;
  $("bt-name").addEventListener("input", renderForm);
  $("bt-form").addEventListener("submit", place);
  load();
  loadAnswers();
  setInterval(loadAnswers, 60000);
  setInterval(tick, 1000);
  setInterval(load, 20000);
});

const toggle = document.getElementById("theme-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* private window */ }
  });
}
