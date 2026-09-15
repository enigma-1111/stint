const { extras, cors, PAYOUT, USDG } = require("./lib");

async function pingRpc() {
  const urls = [
    "https://robinhood-rpc.publicnode.com",
    "https://rpc.mainnet.chain.robinhood.com",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const json = await res.json();
      if (json && json.result) {
        return { ok: true, rpc: url, chainId: json.result };
      }
    } catch {
      /* next */
    }
  }
  return { ok: false };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const rpc = await pingRpc();
  res.status(rpc.ok ? 200 : 503).json({
    ok: rpc.ok,
    name: "stint",
    live: "https://stint-tau.vercel.app",
    extras: extras().length,
    payout: PAYOUT,
    token: USDG,
    rpc,
  });
};
