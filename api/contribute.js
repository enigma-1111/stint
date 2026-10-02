const { extras, verifyPay, persistChapter, cors, normalizeKind, normalizeBy } = require("./lib");
const STINT = "0x0a370eE4286b42F6a1F0cE4E500669e03218b11E";
const RH_RPC = "https://rpc.mainnet.chain.robinhood.com";

function pad64(hex) {
  return String(hex || "").replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

async function holdsStint(addr) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(addr || ""))) return false;
  const data = "0x70a08231" + pad64(addr);
  try {
    const res = await fetch(RH_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: STINT, data }, "latest"] }),
    });
    const json = await res.json();
    return BigInt(String((json && json.result) || "0x0")) > 0n;
  } catch {
    return false;
  }
}

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
    const held = await holdsStint(paid.from);
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
      held,
    };
    rows.push(row);
    const persisted = await persistChapter(row).catch(() => false);
    res.status(200).json({
      ok: true,
      count: rows.length,
      block: paid.block,
      kind,
      by,
      rail: paid.rail,
      asset: paid.asset,
      held,
      persisted: Boolean(persisted),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "verify failed" });
  }
};
