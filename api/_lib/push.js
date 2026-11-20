// Shared pieces for the push-notification functions (api/push/*).
// Files under api/_lib are helpers, not routes.
//
// Store (Upstash Redis, same database as the rest of linkCS):
//   push:subs            hash  subId -> subscription JSON (endpoint + keys)
//   push:due             zset  reminder JSON, scored by when to send (ms)
//   push:mine:<subId>    hash  reminderId -> reminder JSON (to list / cancel)
//
// Env: UPSTASH/KV vars (store), VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (signing),
// PUSH_SECRET (who may trigger sending), optional QSTASH_TOKEN (exact-time
// delivery: one delayed QStash message per reminder).

import { createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import webpush from "web-push";

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const SITE = "https://linkcs.vercel.app";

export function storeReady() { return !!(URL_ && TOKEN); }
export function pushReady() { return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY); }

export async function pipeline(cmds) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map((x) => x.result);
}
export async function redis(...cmd) { return (await pipeline([cmd]))[0]; }

export function body(req) {
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch { return {}; } }
  return req.body || {};
}
export const newId = () => randomBytes(6).toString("hex");
export const subIdOf = (endpoint) => createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 20);

// Push services browsers actually use. Anything else is refused, so the
// store cannot be used to make linkCS send requests to arbitrary hosts.
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/,
  /^updates\.push\.services\.mozilla\.com$/, /\.push\.services\.mozilla\.com$/];
export function validSubscription(s) {
  if (!s || typeof s !== "object" || !s.keys) return false;
  let u;
  try { u = new URL(s.endpoint); } catch { return false; }
  if (u.protocol !== "https:" || !PUSH_HOSTS.some((re) => re.test(u.hostname))) return false;
  return typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string" &&
    s.keys.p256dh.length < 200 && s.keys.auth.length < 100 && s.endpoint.length < 1000;
}

export function secretOk(req) {
  const want = process.env.PUSH_SECRET || "";
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    String((req.query && req.query.key) || "");
  if (!want || !got) return false;
  const h = (x) => createHash("sha256").update(x).digest();
  return timingSafeEqual(h(want), h(got));
}

// Send one notification. Returns "ok", "gone" (subscription expired: caller
// deletes it) or "error".
export async function send(sub, payload) {
  webpush.setVapidDetails(SITE, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 600, urgency: "high" });
    return "ok";
  } catch (e) {
    return e && (e.statusCode === 404 || e.statusCode === 410) ? "gone" : "error";
  }
}

// ---------- the bus timetable, read from the same file the site uses ----------
// js/bus-data.js is a plain browser script (no DOM). It is run here in a
// sandbox so a reminder is checked against the timetable as deployed NOW,
// not as it was when the reminder was set.
let BUS = null;
export function bus() {
  if (BUS) return BUS;
  const code = readFileSync(join(process.cwd(), "js", "bus-data.js"), "utf8");
  BUS = vm.runInNewContext(code + "\n;({ SCHEDULES, DIRS, trips, dayKey, to12h, toMinutes });", { console });
  return BUS;
}

// Abu Dhabi is UTC+4 with no daylight saving.
export function abuDhabiMs(dateIso, mins) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0) - 4 * 3600000 + mins * 60000;
}

// The runs of one direction on one service date ("2026-11-20"), cancelled
// runs left out.
export function runsOn(dateIso, dir) {
  const B = bus();
  const [y, m, d] = dateIso.split("-").map(Number);
  const sched = B.SCHEDULES[B.dayKey(new Date(y, m - 1, d))];
  return B.trips(sched, sched.dirs[dir]).all;
}

// Book a delayed QStash delivery to /api/push/fire for `atMs`. Without a
// QSTASH_TOKEN this is skipped and the reminder waits for the next scheduled
// call of /api/push/fire.
export async function schedule(atMs) {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return false;
  const base = (process.env.QSTASH_URL || "https://qstash.upstash.io").replace(/\/$/, "");
  const r = await fetch(`${base}/v2/publish/${SITE}/api/push/fire`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Upstash-Not-Before": String(Math.floor(atMs / 1000)),
      "Upstash-Forward-Authorization": `Bearer ${process.env.PUSH_SECRET || ""}`,
      "Upstash-Retries": "2",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  return r.ok;
}
