// GET  /api/push/broadcast                      -> {subs, log}   (admin)
// POST /api/push/broadcast {title, body, url}   -> {sent, gone, failed}
//
// Admin only: Authorization: Bearer <STATS_KEY> (the /admin password).
// Sends one notification to every device that turned notifications on.
// Devices whose subscription has expired are removed as they bounce.
// A 60-second lock stops a double tap from sending the same thing twice.
import { createHash, timingSafeEqual } from "node:crypto";
import { storeReady, pushReady, pipeline, redis, body, send } from "../_lib/push.js";

const LOG = "push:log";
const PAGES = new Set(["/", "/pages/bus", "/pages/mess", "/pages/week", "/pages/rooms", "/archive/"]);

function adminOk(req) {
  const want = process.env.STATS_KEY || "";
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!want || !got) return false;
  const h = (x) => createHash("sha256").update(x).digest();
  return timingSafeEqual(h(want), h(got));
}
const clean = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const origin = String(req.headers.origin || "");
  if (/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!adminOk(req)) return res.status(401).json({ ok: false, error: "password needed" });
  if (!storeReady() || !pushReady()) return res.status(503).json({ ok: false, error: "notifications not configured" });

  try {
    if (req.method === "GET") {
      // sign-ups per day (Abu Dhabi days), newest first
      const days = Math.min(90, Math.max(1, parseInt((req.query || {}).days, 10) || 30));
      const keys = [];
      for (let i = 0; i < days; i++) keys.push(new Date(Date.now() + 4 * 3600000 - i * 86400000).toISOString().slice(0, 10));
      const out = await pipeline([["HLEN", "push:subs"], ["LRANGE", LOG, "0", "9"],
        ...keys.map((d) => ["HGETALL", `hits:push:${d}`])]);
      const perDay = keys.map((day, i) => {
        const f = out[2 + i] || [], o = {};
        for (let j = 0; j < f.length; j += 2) o[f[j]] = Number(f[j + 1]);
        return { day, on: o.on || 0, off: o.off || 0 };
      });
      return res.status(200).json({ ok: true, subs: Number(out[0]) || 0, perDay,
        log: (out[1] || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean) });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "method not allowed" });
    }

    const q = body(req);
    const title = clean(q.title, 60), text = clean(q.body, 180);
    const url = PAGES.has(q.url) ? q.url : "/";
    if (!title) return res.status(400).json({ ok: false, error: "needs a title" });
    if (!(await redis("SET", "push:broadcast-lock", "1", "NX", "EX", "60"))) {
      return res.status(429).json({ ok: false, error: "a broadcast went out less than a minute ago" });
    }

    const flat = (await redis("HGETALL", "push:subs")) || [];
    const subs = [];
    for (let i = 0; i < flat.length; i += 2) { try { subs.push([flat[i], JSON.parse(flat[i + 1])]); } catch { /* skip */ } }
    let sent = 0, failed = 0;
    const gone = [];
    const msg = { title, body: text, url, tag: "linkcs-broadcast" };
    for (let i = 0; i < subs.length; i += 20) {                 // 20 at a time
      const batch = subs.slice(i, i + 20);
      const results = await Promise.all(batch.map(([, s]) => send(s, msg)));
      results.forEach((r, j) => {
        if (r === "ok") sent++;
        else if (r === "gone") gone.push(batch[j][0]);
        else failed++;
      });
    }
    const cmds = gone.flatMap((id) => [["HDEL", "push:subs", id], ["DEL", `push:mine:${id}`]]);
    const entry = { at: Date.now(), title, body: text, url, sent, gone: gone.length, failed };
    cmds.push(["LPUSH", LOG, JSON.stringify(entry)], ["LTRIM", LOG, "0", "49"]);
    await pipeline(cmds);
    return res.status(200).json({ ok: true, ...entry });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
