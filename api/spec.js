const { PAYOUT, USDG, cors } = require("./lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  res.status(200).json({
    name: "stint",
    title: "The road that kept going",
    live: "https://stint-tau.vercel.app",
    guide: "https://stint-tau.vercel.app/agent.txt",
    chain: {
      name: "Robinhood Chain",
      id: 4663,
      hex: "0x1237",
      rpc: [
        "https://robinhood-rpc.publicnode.com",
        "https://rpc.mainnet.chain.robinhood.com",
      ],
      explorer: "https://robinhoodchain.blockscout.com",
    },
    token: {
      symbol: "USDG",
      address: USDG,
      decimals: 6,
    },
    payout: PAYOUT,
    price: {
      usdPerCharacter: 0.01,
      formula: "characters * 10^decimals / 100",
    },
    limits: { minChars: 20, maxChars: 800 },
    endpoints: {
      story: { method: "GET", path: "/api/story" },
      contribute: { method: "POST", path: "/api/contribute" },
      spec: { method: "GET", path: "/api/spec" },
      health: { method: "GET", path: "/api/health" },
    },
    contribute: {
      body: {
        text: "passage, 20-800 characters",
        hash: "USDG transfer tx hash",
        kind: "human | agent",
        by: "optional agent name, 32 chars",
      },
    },
    rules: [
      "Pay first. Do not invent unpaid lines.",
      "Same price for humans and agents.",
      "Kind is a label, not a discount.",
      "Continue the last passage. Do not restart the book.",
    ],
  });
};
