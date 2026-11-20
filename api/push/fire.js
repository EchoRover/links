// POST|GET /api/push/fire   (Authorization: Bearer <PUSH_SECRET>)
//
// Sends every reminder that is due. Called by QStash at each reminder's exact
// time (booked in remind.js) and, as a safety net, by any scheduler with the
// secret. Running it twice is harmless: a reminder is removed from the queue
// (ZREM returns 1) before it is sent, so it can only go out once.
//
// Each bus reminder is re-checked against the timetable as deployed now: if
// the run is gone, the message says so and names the nearest run instead.
import { storeReady, pushReady, pipeline, redis, secretOk, send, runsOn, abuDhabiMs, bus } from "../_lib/push.js";

const SLACK = 30000;   // send anything due within the next 30 s

function busMessage(rem) {
  const B = bus();
  const dir = B.DIRS[rem.dir];
  const runs = runsOn(rem.date, rem.dir);
  const still = runs.find((t) => t.time === rem.time);
  const url = "/pages/bus";
  if (still) {
    const left = Math.max(0, Math.round((abuDhabiMs(rem.date, still.mins) - Date.now()) / 60000));
    return {
      title: `Bus ${dir.short.toLowerCase()} in ${left} min`,
      body: `${B.to12h(still.time)} from ${dir.from}${still.vehicle ? ` · ${still.vehicle}` : ""}`,
      url,
    };
  }
  const want = B.toMinutes(rem.time);
  const near = runs.slice().sort((a, b) => Math.abs(a.mins - want) - Math.abs(b.mins - want))[0];
  return {
    title: `Your ${B.to12h(rem.time)} bus ${dir.short.toLowerCase()} is off the timetable`,
    body: near ? `Nearest run: ${B.to12h(near.time)} from ${dir.from}. Check linkCS.` : "Check the bus page on linkCS.",
    url,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!secretOk(req)) return res.status(401).json({ ok: false, error: "not allowed" });
  if (!storeReady() || !pushReady()) return res.status(503).json({ ok: false, error: "notifications not configured" });
  try {
    const due = (await redis("ZRANGEBYSCORE", "push:due", "-inf", String(Date.now() + SLACK), "LIMIT", "0", "200")) || [];
    let sent = 0, gone = 0, failed = 0;
    for (const json of due) {
      if ((await redis("ZREM", "push:due", json)) !== 1) continue;      // someone else took it
      let rem;
      try { rem = JSON.parse(json); } catch { continue; }
      const [subJson] = await pipeline([["HGET", "push:subs", rem.sub], ["HDEL", `push:mine:${rem.sub}`, rem.rid]]);
      if (!subJson) continue;
      const msg = rem.kind === "bus" ? busMessage(rem) : null;
      if (!msg) continue;
      const r = await send(JSON.parse(subJson), msg);
      if (r === "ok") sent++;
      else if (r === "gone") { gone++; await pipeline([["HDEL", "push:subs", rem.sub], ["DEL", `push:mine:${rem.sub}`]]); }
      else failed++;
    }
    return res.status(200).json({ ok: true, due: due.length, sent, gone, failed });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
