const { cors } = require("./lib");
const { quote } = require("./rails");

function param(req, url, key, fallback) {
  const q = req.query && req.query[key];
  if (q != null && String(q)) return String(q);
  return url.searchParams.get(key) || fallback;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const url = new URL(req.url, "https://stint-tau.vercel.app");
  const chars = Math.max(0, parseInt(param(req, url, "chars", "0"), 10) || 0);
  const rail = param(req, url, "rail", "robinhood");
  const asset = param(req, url, "asset", "");
  if (chars < 1) {
    res.status(400).json({ ok: false, error: "chars required" });
    return;
  }
  try {
    const q = await quote(chars, rail, asset);
    res.status(200).json({ ok: true, ...q });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "quote failed" });
  }
};
