const { extras, verifyPay, cors } = require("./lib");
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const text = String(body.text || "").trim();
  const hash = String(body.hash || "").trim();
  const chars = Array.from(String(body.text || "")).length;
  if (chars < 20 || chars > 800 || !text) {
    res.status(400).json({ ok: false, error: "Write 20 to 800 characters." });
    return;
  }
  try {
    const paid = await verifyPay(hash, chars);
    if (!paid) { res.status(400).json({ ok: false, error: "Payment not found yet. Wait and retry." }); return; }
    const rows = extras();
    if (rows.some((r) => r.hash === hash)) { res.status(200).json({ ok: true, deduped: true }); return; }
    rows.push({ text, hash, chars, from: paid.from, at: new Date().toISOString() });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "verify failed" });
  }
};
