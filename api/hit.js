// ============================================================
// POST /api/hit   {t:"view"|"click", p, w, d, r?, l?}  — count one thing
// GET  /api/hit?days=14   (Authorization: Bearer <STATS_KEY>) — the totals
//
// How linkCS is actually used: which pages get opened, on what days and at
// what hours, on phones or laptops, and which links people tap. Counts only.
//
// What is NOT kept: no IP, no cookie, no user agent, no name. The only
// per-device thing is `d`, a random id the page made up and keeps in
// localStorage, and it is never stored as itself: it goes into a Redis
// HyperLogLog, which can answer "how many different devices" and nothing
// else (the ids cannot be read back out of it). Clear site data and you are a
// new device, which is fine.
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

async function record(q) {
  const t = q.t === "click" ? "click" : "view";
  const page = pageName(q.p);
  const dev = clean(q.d, 40);
  const { day, hour } = abuDhabi();
  const cmds = [];
  const touch = (key) => cmds.push(["EXPIRE", key, TTL]);

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

    cmds.push(["HINCRBY", `hits:views:${day}`, page, 1]); touch(`hits:views:${day}`);
    cmds.push(["HINCRBY", `hits:hours:${day}`, String(hour), 1]); touch(`hits:hours:${day}`);
    cmds.push(["HINCRBY", `hits:kind:${day}`, kind, 1]); touch(`hits:kind:${day}`);
    cmds.push(["HINCRBY", `hits:ref:${day}`, ref, 1]); touch(`hits:ref:${day}`);
    // Installed app (home-screen icon) vs a browser tab.
    const mode = q.a ? "app" : "browser";
    cmds.push(["HINCRBY", `hits:mode:${day}`, mode, 1]); touch(`hits:mode:${day}`);
    if (dev) {
      cmds.push(["PFADD", `hits:dev:${day}`, dev]); touch(`hits:dev:${day}`);
      cmds.push(["PFADD", `hits:dev:${day}:${page}`, dev]); touch(`hits:dev:${day}:${page}`);
    }
  } else {
    const label = clean(q.l, MAX_LABEL);
    if (!label) return;
    if (dev) {
      const cap = `hits:cap:${day}:${dev}`;
      const [n] = await pipeline([["INCR", cap], ["EXPIRE", cap, 26 * 3600]]);
      if (n > MAX_CLICKS_PER_DEVICE) return;
    }
    const key = `hits:clicks:${day}`;
    cmds.push(["HINCRBY", key, `${page} ${label}`, 1]); touch(key);
  }
  await pipeline(cmds);
}

async function report(days) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const { day } = abuDhabi(now - i * 24 * 3600 * 1000);
    out.push(day);
  }
  const cmds = [];
  for (const day of out) {
    cmds.push(["HGETALL", `hits:views:${day}`], ["HGETALL", `hits:hours:${day}`],
              ["HGETALL", `hits:kind:${day}`], ["HGETALL", `hits:ref:${day}`],
              ["HGETALL", `hits:clicks:${day}`], ["PFCOUNT", `hits:dev:${day}`],
              ["HGETALL", `hits:mode:${day}`]);
  }
  const res = await pipeline(cmds);
  const perPage = [];
  const rows = out.map((day, i) => {
    const [views, hours, kind, ref, clicks, devices, mode] = res.slice(i * 7, i * 7 + 7);
    const v = pairs(views);
    for (const p of Object.keys(v)) perPage.push([day, p]);
    return { day, devices: Number(devices) || 0, views: v, hours: pairs(hours),
             kind: pairs(kind), ref: pairs(ref), clicks: pairs(clicks), mode: pairs(mode) };
  });
  // Distinct devices per page: one PFCOUNT per page that had any views.
  if (perPage.length) {
    const counts = await pipeline(perPage.map(([day, p]) => ["PFCOUNT", `hits:dev:${day}:${p}`]));
    const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
    perPage.forEach(([day, p], i) => {
      (byDay[day].pageDevices ||= {})[p] = Number(counts[i]) || 0;
    });
  }
  // Devices across the whole window, not the sum of days (one person on
  // five days is one device, not five).
  const [total] = await pipeline([["PFCOUNT", ...out.map((d) => `hits:dev:${d}`)]]);
  return { ok: true, days: rows, devicesInWindow: Number(total) || 0 };
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
