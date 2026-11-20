// POST   /api/push/subscribe {subscription}  -> {ok, id}; sends a "you're set" test
// DELETE /api/push/subscribe {id}            -> forget this phone and its reminders
// GET    /api/push/subscribe                 -> {key} the public VAPID key
//
// A subscription is what the browser hands back when someone allows
// notifications: an address at Apple's/Google's push service plus keys. It is
// not a name or a number; linkCS cannot tell who it belongs to.
import { storeReady, pushReady, pipeline, redis, body, subIdOf, validSubscription, send } from "../_lib/push.js";

const MAX_SUBS = 5000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ok: true, key: process.env.VAPID_PUBLIC_KEY || null });
  if (!storeReady() || !pushReady()) return res.status(503).json({ ok: false, error: "notifications not configured" });
  const q = body(req);
  try {
    if (req.method === "POST") {
      const sub = q.subscription;
      if (!validSubscription(sub)) return res.status(400).json({ ok: false, error: "bad subscription" });
      if ((await redis("HLEN", "push:subs")) >= MAX_SUBS) return res.status(507).json({ ok: false, error: "full" });
      const id = subIdOf(sub.endpoint);
      await redis("HSET", "push:subs", id, JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }));
      const r = await send(sub, { title: "linkCS notifications are on",
        body: "Tap Remind me on a bus and you'll get a heads-up 10 minutes before.", url: "/" });
      return res.status(200).json({ ok: true, id, test: r });
    }
    if (req.method === "DELETE") {
      const id = String(q.id || "").slice(0, 40);
      if (!id) return res.status(400).json({ ok: false, error: "need id" });
      const mine = (await redis("HGETALL", `push:mine:${id}`)) || [];
      const cmds = [["HDEL", "push:subs", id], ["DEL", `push:mine:${id}`]];
      for (let i = 1; i < mine.length; i += 2) cmds.push(["ZREM", "push:due", mine[i]]);
      await pipeline(cmds);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
