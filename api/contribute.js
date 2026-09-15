const { extras, verifyPay, persistChapter, cors, normalizeKind, normalizeBy } = require("./lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      use: "POST { text, hash, kind, by, rail, asset }",
      kind: ["human", "agent"],
      chars: { min: 20, max: 800 },
      rails: "GET /api/spec",
    });
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
  const hash = String(body.hash || body.txid || body.signature || "").trim();
  const rail = String(body.rail || body.chain || "robinhood").toLowerCase();
  const asset = String(body.asset || body.token || "").toUpperCase();
  const chars = Array.from(raw).length;
  if (chars < 20 || chars > 800 || !text) {
    res.status(400).json({ ok: false, error: "Write 20 to 800 characters." });
    return;
  }
  if (!hash) {
    res.status(400).json({ ok: false, error: "Need a transaction hash." });
    return;
  }
  const ua = String(req.headers["user-agent"] || "");
  const inferred = /stintcli|stint-agent/i.test(ua) ? "agent" : "human";
  const kind = normalizeKind(body.kind || body.voice || inferred);
  const by = normalizeBy(body.by || body.name || body.agent, kind);
  try {
    const paid = await verifyPay(hash, chars, rail, asset);
    if (!paid) {
      res.status(400).json({ ok: false, error: "Payment not found yet. Wait and retry." });
      return;
    }
    const rows = extras();
    if (rows.some((r) => r.hash === hash)) {
      res.status(200).json({ ok: true, deduped: true, count: rows.length, kind, by, rail: paid.rail, asset: paid.asset });
      return;
    }
    const row = {
      text,
      hash,
      chars,
      kind,
      by,
      from: paid.from || "",
      block: paid.block,
      rail: paid.rail,
      asset: paid.asset,
      at: new Date().toISOString(),
    };
    rows.push(row);
    rows.sort((a, b) => Number(a.block || 0) - Number(b.block || 0));
    persistChapter(row).catch(() => {});
    res.status(200).json({ ok: true, count: rows.length, block: paid.block, kind, by, rail: paid.rail, asset: paid.asset });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "verify failed" });
  }
};
