// POST   /api/push/remind {id, kind:"bus", dir, date, time} -> {ok, rid, at}
// DELETE /api/push/remind {id, rid}                         -> cancel one
// GET    /api/push/remind?id=...                            -> {reminders:[...]}
//
// A bus reminder fires LEAD minutes before the run leaves. The run is checked
// against the timetable both now and again when it fires (see fire.js), so a
// reminder for a run that transport has since moved or cancelled says so.
import { storeReady, pushReady, pipeline, redis, body, newId, runsOn, abuDhabiMs, schedule } from "../_lib/push.js";

const LEAD = 10;                 // minutes before departure
const MAX_PER_PHONE = 20;
const DIRS = new Set(["toCampus", "toDorms"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!storeReady() || !pushReady()) return res.status(503).json({ ok: false, error: "notifications not configured" });
  const q = req.method === "GET" ? (req.query || {}) : body(req);
  const id = String(q.id || "").slice(0, 40);
  if (!/^[0-9a-f]{20}$/.test(id)) return res.status(400).json({ ok: false, error: "need id" });
  try {
    if (!(await redis("HEXISTS", "push:subs", id))) return res.status(404).json({ ok: false, error: "notifications are off on this device" });

    if (req.method === "GET") {
      const flat = (await redis("HGETALL", `push:mine:${id}`)) || [];
      const list = [];
      for (let i = 1; i < flat.length; i += 2) { try { list.push(JSON.parse(flat[i])); } catch { /* skip */ } }
      return res.status(200).json({ ok: true, reminders: list.filter((r) => r.at > Date.now() - 3600000) });
    }

    if (req.method === "POST") {
      if (q.kind !== "bus" || !DIRS.has(q.dir)) return res.status(400).json({ ok: false, error: "unknown reminder" });
      const date = String(q.date || ""), time = String(q.time || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ ok: false, error: "bad date or time" });
      }
      const run = runsOn(date, q.dir).find((t) => t.time === time);
      if (!run) return res.status(409).json({ ok: false, error: "that bus is not on the timetable" });
      const leaves = abuDhabiMs(date, run.mins);
      if (leaves < Date.now()) return res.status(409).json({ ok: false, error: "that bus has left" });
      if (leaves > Date.now() + 3 * 864e5) return res.status(400).json({ ok: false, error: "too far ahead" });
      if ((await redis("HLEN", `push:mine:${id}`)) >= MAX_PER_PHONE) {
        return res.status(429).json({ ok: false, error: "too many reminders on this phone" });
      }
      const at = Math.max(Date.now() + 15000, leaves - LEAD * 60000);
      const rem = { rid: newId(), sub: id, kind: "bus", dir: q.dir, date, time, at, leaves };
      const json = JSON.stringify(rem);
      await pipeline([
        ["ZADD", "push:due", String(at), json],
        ["HSET", `push:mine:${id}`, rem.rid, json],
        ["EXPIRE", `push:mine:${id}`, String(4 * 86400)],
      ]);
      const booked = await schedule(at).catch(() => false);
      return res.status(200).json({ ok: true, rid: rem.rid, at, exact: booked });
    }

    if (req.method === "DELETE") {
      const rid = String(q.rid || "").slice(0, 20);
      const json = await redis("HGET", `push:mine:${id}`, rid);
      if (json) await pipeline([["ZREM", "push:due", json], ["HDEL", `push:mine:${id}`, rid]]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
