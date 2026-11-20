// GET /api/version -> {v} : which deploy is live.
// The service worker (sw.js) serves pages from its cache instantly and only
// asks this, in the background, to learn whether anything changed. v is the
// git commit Vercel built from, so every push is a new version.
export default function handler(req, res) {
  const v = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev";
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ v: v.slice(0, 12) });
}
