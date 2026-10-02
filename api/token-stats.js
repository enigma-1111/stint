const { cors } = require("./lib");
const CA = "0x0a370eE4286b42F6a1F0cE4E500669e03218b11E";
const POOL = "https://pools.fun/token/" + CA;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const out = {
    ok: true,
    symbol: "STINT",
    name: "Stint",
    contract: CA,
    chainId: 4663,
    pair: "WETH",
    pool: POOL,
    fee: "1% swap. 90% to holders in STINT and WETH.",
    claim: POOL,
    priceUsd: null,
    marketCap: null,
    fdv: null,
    liquidityUsd: null,
    volume24h: null,
    change24h: null,
    buys24h: null,
    sells24h: null,
    holders: null,
    updated: new Date().toISOString(),
  };
  try {
    const dex = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + CA, { headers: { accept: "application/json" } });
    const data = await dex.json();
    const pair = (data.pairs || []).find((p) => String(p.chainId || "").toLowerCase() === "robinhood") || (data.pairs || [])[0];
    if (pair) {
      out.priceUsd = num(pair.priceUsd);
      out.marketCap = num(pair.marketCap || pair.fdv);
      out.fdv = num(pair.fdv);
      out.liquidityUsd = num(pair.liquidity && pair.liquidity.usd);
      out.volume24h = num(pair.volume && pair.volume.h24);
      out.change24h = num(pair.priceChange && pair.priceChange.h24);
      out.buys24h = num(pair.txns && pair.txns.h24 && pair.txns.h24.buys);
      out.sells24h = num(pair.txns && pair.txns.h24 && pair.txns.h24.sells);
      out.pairAddress = pair.pairAddress || "";
    }
  } catch {}
  try {
    const scout = await fetch("https://robinhoodchain.blockscout.com/api/v2/tokens/" + CA, { headers: { accept: "application/json" } });
    const token = await scout.json();
    out.holders = num(token.holders_count || token.holders);
    if (token.symbol) out.symbol = token.symbol;
    if (token.name) out.name = token.name;
  } catch {}
  res.status(200).json(out);
};
