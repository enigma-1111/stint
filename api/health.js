const { extras, cors } = require("./lib");
const { EVM_PAYOUT, BTC_PAYOUT, SOL_PAYOUT, CHAINS } = require("./rails");

async function ping(url, body) {
  try {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
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
  const rh = CHAINS.robinhood.rpc[0];
  const evm = await ping(rh, { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
  const btc = await ping("https://mempool.space/api/blocks/tip/height");
  const sol = await ping("https://api.mainnet-beta.solana.com", { jsonrpc: "2.0", id: 1, method: "getHealth", params: [] });
  const persist = Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
  const ready = Boolean(evm && btc && sol);
  res.status(ready ? 200 : 503).json({
    ok: ready,
    ready,
    name: "stint",
    live: "https://stint-tau.vercel.app",
    extras: extras().length,
    rails: 22,
    persist,
    payouts: { evm: EVM_PAYOUT, bitcoin: BTC_PAYOUT, solana: SOL_PAYOUT },
    ping: { evm, bitcoin: btc, solana: sol },
  });
};
