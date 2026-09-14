const PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C".toLowerCase();
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168".toLowerCase();
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RPC = "https://robinhood-rpc.publicnode.com";
const g = globalThis;
if (!g.__stintExtra) g.__stintExtra = [];
function extras() { return g.__stintExtra; }
async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "rpc");
  return json.result;
}
function addrFromTopic(topic) {
  return ("0x" + String(topic || "").slice(-40)).toLowerCase();
}
function neededAmount(chars, decimals) {
  return BigInt(chars) * 10n ** BigInt(decimals) / 100n;
}
async function usdgDecimals() {
  const raw = await rpc("eth_call", [{ to: USDG, data: "0x313ce567" }, "latest"]);
  const n = parseInt(raw, 16);
  return n >= 0 && n <= 36 ? n : 6;
}
async function verifyPay(hash, chars) {
  if (!hash || !hash.startsWith("0x") || hash.length < 66) return null;
  const rec = await rpc("eth_getTransactionReceipt", [hash]);
  if (!rec || rec.status !== "0x1") return null;
  const dec = await usdgDecimals();
  const need = neededAmount(chars, dec);
  const logs = rec.logs || [];
  for (const log of logs) {
    if (String(log.address || "").toLowerCase() !== USDG) continue;
    if (!log.topics || log.topics[0] !== TRANSFER) continue;
    const to = addrFromTopic(log.topics[2]);
    if (to !== PAYOUT) continue;
    const amt = BigInt(log.data || "0x0");
    if (amt >= need) return { from: addrFromTopic(log.topics[1]), amount: amt.toString() };
  }
  return null;
}
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}
module.exports = { PAYOUT, extras, verifyPay, cors };
