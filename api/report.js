// ============================================================
// POST /api/report   — "this dish is wrong"
// GET  /api/report?week=1&meal=lunch&day=Monday — counts for that cell
//
// Anonymous on purpose. No account, no proof: the people who know the menu is
// wrong are standing in the queue holding a tray, and anything costing more
// than one tap gets nothing. Signal comes from volume, not from any single
// report being trustworthy.
//
// Three shapes of report, because a bare "wrong" cannot be acted on:
//   dish   one dish was not what turned up. Optionally carries `instead`,
//          the dish that DID - which is the only field that lets the menu
//          ever be corrected rather than just doubted.
//   meal   the whole meal bore no resemblance. One tap instead of fourteen,
//          and it keeps festival days from reading as fourteen separate
//          failures of the sheet - Ganesh Chaturthi would otherwise look like
//          the worst data we have.
//   right  someone confirming the sheet was correct. Without this the only
//          thing ever recorded is complaints, and a rate built from
//          complaints alone has no denominator.
//
// Storage is Upstash Redis over its REST API rather than a client library, so
// this repo stays dependency-free - there is no package.json and adding one to
// a static site to write two integers would be a poor trade. Vercel's Upstash
// integration sets both env vars below.
//
// If the store is not configured the endpoint says so plainly and the page
// falls back to remembering flags in the browser. A silent failure here would
// be the worst outcome: people would tap, see it work, and nothing would be
// recorded.
// ============================================================

// The Vercel Marketplace Upstash integration has injected these under two
// different names over time - UPSTASH_* now, KV_REST_API_* for stores that came
// across from the retired Vercel KV. Accepting both means the integration can
// be installed without anyone having to rename a variable to match this file,
// which is the kind of step that gets skipped and then debugged for an hour.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const MEALS = ["breakfast", "lunch", "dinner"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
              "Saturday", "Sunday"];
// One flag per dish per hour. A nudge against a bored thumb, not a security
// control - anonymous means gameable, and the counts should read as "several
// people said so", never as a number.
//
// An hour rather than a day for two reasons. It is long enough to cover one
// meal sitting, which is all the double-tapping it needs to stop. And the key
// it writes contains the reporter's IP, so the shorter it lives the less true
// it is that this page keeps anything about who tapped.
const COOLDOWN = 60 * 60;
const MAX_LEN = 120;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

// The cell a flag belongs to. Rejects anything not in the menu's own
// vocabulary so a crafted request cannot invent keys in the store.
function cell(q) {
  const week = String(q.week);
  const meal = String(q.meal || "");
  const day = String(q.day || "");
  if (!["1", "2"].includes(week)) return null;
  if (!MEALS.includes(meal)) return null;
  if (!DAYS.includes(day)) return null;
  return `${week}:${meal}:${day}`;
}

function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

const KINDS = ["dish", "meal", "right"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  // Says exactly what is missing. A bare "not configured" sends you to the
  // dashboard guessing; this tells you whether the integration ran at all.
  if (!URL_ || !TOKEN) {
    return res.status(503).json({
      ok: false,
      error: "no store configured",
      sawUrl: Boolean(URL_),
      sawToken: Boolean(TOKEN),
      detail: "add a Redis store from the Vercel Marketplace and redeploy - " +
              "it injects UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN)",
    });
  }

  // GET with no query is a health check: is the store reachable from here?
  if (req.method === "GET" && !req.query.week) {
    try {
      await redis("PING");
      return res.status(200).json({ ok: true, store: "reachable" });
    } catch {
      return res.status(502).json({ ok: false, error: "store unreachable" });
    }
  }

  try {
    if (req.method === "GET") {
      const key = cell(req.query);
      if (!key) return res.status(400).json({ ok: false, error: "bad cell" });
      const counts = await redis("HGETALL", `mess:flags:${key}`);
      // Upstash returns a flat [field, value, ...] array
      const out = {};
      for (let i = 0; i < (counts || []).length; i += 2) {
        out[counts[i]] = Number(counts[i + 1]);
      }
      return res.status(200).json({ ok: true, counts: out });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const key = cell(body);
      const kind = KINDS.includes(body.kind) ? body.kind : "dish";
      const dish = clean(body.dish);
      const course = clean(body.course);
      const instead = clean(body.instead);
      if (!key || (kind === "dish" && !dish)) {
        return res.status(400).json({ ok: false, error: "bad report" });
      }
      // meal-level reports share one slot so they aggregate per cell
      const field = kind === "dish" ? dish : `__${kind}__`;

      // Vercel puts the real client address here; behind a proxy it is a list
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
                 || "unknown";
      const seen = `mess:seen:${ip}:${key}:${field}`;
      const first = await redis("SET", seen, "1", "NX", "EX", String(COOLDOWN));
      if (first === null) {
        const counts = await redis("HGET", `mess:flags:${key}`, field);
        return res.status(200).json({ ok: true, already: true,
                                      count: Number(counts || 0) });
      }

      const count = await redis("HINCRBY", `mess:flags:${key}`, field, "1");
      // a short tail of raw reports, so the counts can be read in context
      await redis("LPUSH", "mess:reports", JSON.stringify({
        at: new Date().toISOString(), kind, week: body.week, meal: body.meal,
        day: body.day, course, dish, instead,
      }));
      await redis("LTRIM", "mess:reports", "0", "499");
      return res.status(200).json({ ok: true, count: Number(count) });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "store unreachable" });
  }
}
