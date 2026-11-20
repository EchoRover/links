// GET /api/manifest?d=<device id>  -> the app manifest, with start_url
// carrying that id.
//
// Why: on iPhone, the Home Screen app gets its own storage, separate from the
// Safari tab it was added from, so one phone would count as two devices in
// the usage numbers. js/hit.js points the page's manifest link here with the
// tab's random id; iPhone reads the manifest when "Add to Home Screen" is
// tapped, so the app's first launch opens /?lcid=<id> and hit.js adopts it.
// Stores nothing; the id is the same random string the page already counts.
import { readFileSync } from "node:fs";
import { join } from "node:path";

let BASE = null;

export default function handler(req, res) {
  if (!BASE) BASE = JSON.parse(readFileSync(join(process.cwd(), "manifest.webmanifest"), "utf8"));
  const d = String((req.query && req.query.d) || "");
  const m = { ...BASE };
  if ((req.query || {}).n === "1") m.start_url = "/?notrack=1";       // maintainers stay uncounted in the app too
  else if (/^[a-z0-9]{8,40}$/.test(d)) m.start_url = `/?lcid=${d}`;
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(JSON.stringify(m));
}
