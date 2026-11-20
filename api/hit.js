// ============================================================
// POST /api/hit   {t:"view"|"click", p, w, d, r?, l?}  — count one thing
// GET  /api/hit?days=14   (Authorization: Bearer <STATS_KEY>) — the totals
//
// How linkCS is actually used: which pages get opened, on what days and at
// what hours, on phones or laptops, and which links people tap. Counts only.
//
// What is NOT kept: no IP, no cookie, no user agent, no name. The only
// per-device thing is `d`, a random id the page made up and keeps in
// localStorage. It goes into Redis HyperLogLogs, which can answer "how many
// different devices" and nothing else, and as a short hash into hits:first
// (first day seen), which is how "returning devices" are told apart from new
// ones. Clear site data and you are a new device.
//
// Every key carries the day (Abu Dhabi time) and expires after 400 days, so
// the store holds about a year of counts and never grows past that.
//
// Counting is open (it has to be: every visitor's browser posts here). Reading
// the totals is not: GET needs the STATS_KEY password, set in Vercel's env and
// kept in the maintainer's Keychain (service "linkcs-stats-key"). /stats and
// tools/stats.py send it. No STATS_KEY set = reading is off, never open.
//
// Anonymous, so gameable, like the mess flags: a bored script can inflate a
// count. Page names are a fixed list and link labels are capped, so it cannot
// fill the store with junk keys.
// ============================================================

import { timingSafeEqual, createHash } from "node:crypto";

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const TTL = 400 * 24 * 3600;
const MAX_DAYS = 90;
const MAX_LABEL = 60;
// A device that taps more than this many links in a day stops being counted
// for clicks, so one stuck finger or one script cannot own the click table.
const MAX_CLICKS_PER_DEVICE = 200;

// Every public page, by the URL people see. /pages/x is the same page as /x
// (vercel.json rewrites), so both land on one name. Anything else is "other"
// rather than its own key.
const PAGES = new Set([
  "/", "/bus", "/mess", "/mess-next", "/rooms", "/week", "/timetables",
  "/predict", "/3d", "/both", "/campus", "/m3", "/m4", "/archive",
]);

function pageName(p) {
  let s = String(p || "/").split(/[?#]/)[0].toLowerCase();
  s = s.replace(/^\/pages\//, "/").replace(/\.html$/, "").replace(/\/index$/, "/");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return PAGES.has(s) ? s : "other";
}

// The day and hour in Abu Dhabi, whatever timezone the server runs in.
// UTC+4 all year, no daylight saving.
function abuDhabi(ms = Date.now()) {
  const d = new Date(ms + 4 * 3600 * 1000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

function clean(s, n) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
}

async function pipeline(cmds) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

function pairs(flat) {
  const o = {};
  for (let i = 0; flat && i < flat.length; i += 2) o[flat[i]] = Number(flat[i + 1]);
  return o;
}

// ---------- storage (since 20 Nov 2026, evening) ----------
// One hash per Abu Dhabi day, hits:d:<day>, fields by prefix:
//   v:<page>            views of a page
//   h:<hour>            views in an hour (0-23)
//   ph:<page>|<hour>    views of a page in an hour   (when is Bus checked?)
//   k:<kind>            phone / tablet / desktop
//   r:<source>          where the visit came from
//   m:<app|browser>     installed app or browser tab
//   c:<page> <label>    taps on a link
//   ch:<label>|<hour>   taps on a link in an hour
// plus two HyperLogLogs per day: hits:dev:<day> (distinct devices) and
// hits:ret:<day> (distinct RETURNING devices: seen on an earlier day too),
// and hits:first, device-hash -> first day seen (a hash of the random id, so
// the id itself is not kept there either).
// Days counted before this layout keep their old keys (hits:views:<day> ...);
// report() reads both.
const DAY = (day) => `hits:d:${day}`;
const devHash = (d) => createHash("sha256").update(d).digest("hex").slice(0, 16);

async function record(q) {
  const t = q.t === "click" ? "click" : "view";
  const page = pageName(q.p);
  const dev = clean(q.d, 40);
  const { day, hour } = abuDhabi();
  const D = DAY(day);

  if (t === "view") {
    const w = Number(q.w) || 0;
    const kind = w === 0 ? "unknown" : w < 700 ? "phone" : w < 1100 ? "tablet" : "desktop";
    let ref = "direct";
    try {
      if (q.r) {
        const h = new URL(String(q.r)).hostname.replace(/^www\./, "");
        ref = h.endsWith("linkcs.vercel.app") ? "internal" : clean(h, 40) || "direct";
      }
    } catch { /* not a URL: leave it as direct */ }
    const mode = q.a ? "app" : "browser";
    const cmds = [
      ["HINCRBY", D, `v:${page}`, 1], ["HINCRBY", D, `h:${hour}`, 1], ["HINCRBY", D, `ph:${page}|${hour}`, 1],
      ["HINCRBY", D, `k:${kind}`, 1], ["HINCRBY", D, `r:${ref}`, 1], ["HINCRBY", D, `m:${mode}`, 1],
      ["EXPIRE", D, TTL],
    ];
    if (dev) {
      cmds.push(["PFADD", `hits:dev:${day}`, dev], ["EXPIRE", `hits:dev:${day}`, TTL],
                ["HSETNX", "hits:first", devHash(dev), day]);
    }
    const res = await pipeline(cmds);
    if (dev) {
      const newToday = res[7] === 1;           // first view from this device today
      const brandNew = res[9] === 1;           // never seen before at all
      const more = [];
      if (newToday && !brandNew) more.push(["PFADD", `hits:ret:${day}`, dev], ["EXPIRE", `hits:ret:${day}`, TTL]);
      if (brandNew) more.push(["EXPIRE", "hits:first", TTL]);
      if (more.length) await pipeline(more);
    }
    return;
  }

  const label = clean(q.l, MAX_LABEL);
  if (!label) return;
  if (dev) {
    const cap = `hits:cap:${day}:${dev}`;
    const [n] = await pipeline([["INCR", cap], ["EXPIRE", cap, 26 * 3600]]);
    if (n > MAX_CLICKS_PER_DEVICE) return;
  }
  await pipeline([["HINCRBY", D, `c:${page} ${label}`, 1], ["HINCRBY", D, `ch:${label}|${hour}`, 1], ["EXPIRE", D, TTL]]);
}

async function report(days) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < days; i++) out.push(abuDhabi(now - i * 24 * 3600 * 1000).day);
  const PER = 10;
  const cmds = [];
  for (const day of out) {
    cmds.push(["HGETALL", DAY(day)], ["PFCOUNT", `hits:dev:${day}`], ["PFCOUNT", `hits:ret:${day}`],
              // the old layout, for days counted before the switch
              ["HGETALL", `hits:views:${day}`], ["HGETALL", `hits:hours:${day}`], ["HGETALL", `hits:kind:${day}`],
              ["HGETALL", `hits:ref:${day}`], ["HGETALL", `hits:clicks:${day}`], ["HGETALL", `hits:mode:${day}`],
              ["EXISTS", DAY(day)]);
  }
  const res = await pipeline(cmds);
  const add = (o, k, n) => { o[k] = (o[k] || 0) + n; };
  const rows = out.map((day, i) => {
    const r = res.slice(i * PER, i * PER + PER);
    const row = { day, devices: Number(r[1]) || 0, returning: Number(r[2]) || 0,
                  views: {}, hours: {}, kind: {}, ref: {}, clicks: {}, mode: {}, pageHours: {}, clickHours: {} };
    const f = pairs(r[0]);
    for (const [k, n] of Object.entries(f)) {
      const i2 = k.indexOf(":"), pre = k.slice(0, i2), rest = k.slice(i2 + 1);
      if (pre === "v") add(row.views, rest, n);
      else if (pre === "h") add(row.hours, rest, n);
      else if (pre === "k") add(row.kind, rest, n);
      else if (pre === "r") add(row.ref, rest, n);
      else if (pre === "m") add(row.mode, rest, n);
      else if (pre === "c") add(row.clicks, rest, n);
      else if (pre === "ph" || pre === "ch") {
        const bar = rest.lastIndexOf("|");
        const name = rest.slice(0, bar), hr = rest.slice(bar + 1);
        const tgt = pre === "ph" ? row.pageHours : row.clickHours;
        add((tgt[name] ||= {}), hr, n);
      }
    }
    [["views", 3], ["hours", 4], ["kind", 5], ["ref", 6], ["clicks", 7], ["mode", 8]].forEach(([name, j]) => {
      for (const [k, n] of Object.entries(pairs(r[j]))) add(row[name], k, n);
    });
    return row;
  });
  // Across the whole window, not the sum of days (one person on five days is
  // one device, not five).
  const [total, returning] = await pipeline([
    ["PFCOUNT", ...out.map((d) => `hits:dev:${d}`)],
    ["PFCOUNT", ...out.map((d) => `hits:ret:${d}`)],
  ]);
  return { ok: true, days: rows, devicesInWindow: Number(total) || 0, returningInWindow: Number(returning) || 0 };
}

// Compare hashes so the comparison takes the same time whatever was typed.
function keyOk(req) {
  const want = process.env.STATS_KEY || "";
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!want || !got) return false;
  const h = (x) => createHash("sha256").update(x).digest();
  return timingSafeEqual(h(want), h(got));
}

// The /stats page is served by this site, so it never needs CORS. Local
// previews (localhost, any port) may read too, with the same password.
function cors(req, res) {
  const origin = String(req.headers.origin || "");
  if (/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET" && !keyOk(req)) {
    return res.status(401).json({ ok: false, error: "password needed" });
  }
  if (!URL_ || !TOKEN) {
    return res.status(503).json({ ok: false, error: "no store configured" });
  }
  try {
    if (req.method === "POST") {
      const q = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      await record(q);
      return res.status(204).end();
    }
    if (req.method === "GET") {
      const days = Math.min(MAX_DAYS, Math.max(1, parseInt(req.query.days, 10) || 14));
      return res.status(200).json(await report(days));
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
