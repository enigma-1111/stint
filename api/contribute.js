const { extras, verifyPay, persistChapter, cors } = require("./lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  const raw = String(body.text || "");
  const text = raw.trim();
  const hash = String(body.hash || "").trim();
  const chars = Array.from(raw).length;
  if (chars < 20 || chars > 800 || !text) {
    res.status(400).json({ ok: false, error: "Write 20 to 800 characters." });
    return;
  }
  try {
    const paid = await verifyPay(hash, chars);
    if (!paid) {
      res.status(400).json({ ok: false, error: "Payment not found yet. Wait and retry." });
      return;
    }
    const rows = extras();
    if (rows.some((r) => r.hash === hash)) {
      res.status(200).json({ ok: true, deduped: true, count: rows.length });
      return;
    }
    const row = {
      text,
      hash,
      chars,
      from: paid.from,
      block: paid.block,
      at: new Date().toISOString(),
    };
    rows.push(row);
    rows.sort((a, b) => Number(a.block || 0) - Number(b.block || 0));
    persistChapter(row).catch(() => {});
    res.status(200).json({ ok: true, count: rows.length, block: paid.block });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "verify failed" });
  }
};
