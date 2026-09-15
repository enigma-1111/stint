const { cors } = require("./lib");
const { quote } = require("./rails");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const url = new URL(req.url, "https://stint-tau.vercel.app");
  const chars = Math.max(0, parseInt(url.searchParams.get("chars") || req.query && req.query.chars || "0", 10) || 0);
  const rail = String((req.query && req.query.rail) || url.searchParams.get("rail") || "robinhood");
  const asset = String((req.query && req.query.asset) || url.searchParams.get("asset") || "");
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
