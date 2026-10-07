// ============================================================
// GET  /api/bets?round=acol351-tut5   — every bet on that round
// POST /api/bets  {round, name, picks:[a,b]}  — place one
//
// The ACOL351 tutorial quiz asks 2 of the sheet's unstarred problems. This
// is the side pot: put your name on which two. Nothing is won but the right
// to say you called it.
//
// One bet per name per round, first come wins the name (HSETNX), so nobody
// can overwrite someone else's pick by typing their name. Anonymous like the
// mess flags, so it is gameable; the cap per round keeps a bored script from
// filling the store.
//
// The close time is checked HERE, not just on the page. A page-only cutoff
// would let anyone who walked out of the quiz post the right answer.
// ============================================================

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// One entry per tutorial. `questions` is the count of problems that can be
// asked (the ⋆ ones are excluded by the sheet itself). js/bets.js holds the
// titles and, after the quiz, the answer.
const ROUNDS = {
  "acol351-tut5": { questions: 11, closes: "2026-10-07T15:30:00+04:00" },
};

const MAX_NAME = 32;
const MAX_BETS = 300;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

function cleanName(s) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!URL_ || !TOKEN) {
    return res.status(503).json({ ok: false, error: "no store configured" });
  }

  const q = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}))
    : req.query;
  const id = String(q.round || "");
  const round = ROUNDS[id];
  if (!round) return res.status(404).json({ ok: false, error: "no such round" });
  const key = `bets:${id}`;
  const closed = Date.now() >= Date.parse(round.closes);

  try {
    if (req.method === "GET") {
      const flat = (await redis("HGETALL", key)) || [];
      const bets = [];
      for (let i = 1; i < flat.length; i += 2) {
        try { bets.push(JSON.parse(flat[i])); } catch { /* skip a bad row */ }
      }
      bets.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      return res.status(200).json({ ok: true, closes: round.closes, closed,
                                    questions: round.questions, bets });
    }

    if (req.method === "POST") {
      if (closed) return res.status(403).json({ ok: false, error: "betting closed" });

      const name = cleanName(q.name);
      const picks = Array.isArray(q.picks) ? q.picks.map(Number) : [];
      const valid = name.length > 0 && picks.length === 2 && picks[0] !== picks[1] &&
        picks.every((p) => Number.isInteger(p) && p >= 1 && p <= round.questions);
      if (!valid) return res.status(400).json({ ok: false, error: "need a name and 2 different questions" });

      if (Number(await redis("HLEN", key)) >= MAX_BETS) {
        return res.status(429).json({ ok: false, error: "the pot is full" });
      }

      picks.sort((a, b) => a - b);
      const bet = { name, picks, at: new Date().toISOString() };
      const placed = await redis("HSETNX", key, name.toLowerCase(), JSON.stringify(bet));
      if (Number(placed) === 0) {
        return res.status(409).json({ ok: false, error: "that name already has a bet" });
      }
      return res.status(200).json({ ok: true, bet });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch {
    return res.status(502).json({ ok: false, error: "store unreachable" });
  }
}
