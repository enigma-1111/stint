const { cors } = require("./lib");
const CA = "0x0a370eE4286b42F6a1F0cE4E500669e03218b11E";
const POOL = "https://pools.fun/token/" + CA;
const PAIR = "0x1d8762b0c6104345364af0bc87569b42654a4905";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function holders() {
  const headers = { accept: "application/json", "user-agent": "Mozilla/5.0 stint-token-stats" };
  const urls = [
    "https://robinhoodchain.blockscout.com/api/v2/tokens/" + CA + "/counters",
    "https://robinhoodchain.blockscout.com/api/v2/tokens/" + CA,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const token = await res.json();
      const n = num(token.token_holders_count != null ? token.token_holders_count : token.holders_count != null ? token.holders_count : token.holders);
      if (n != null) return n;
    } catch {}
  }
  return null;
}

async function lifetime() {
  try {
    const url = "https://api.geckoterminal.com/api/v2/networks/robinhood/pools/" + PAIR + "/ohlcv/day?aggregate=1&limit=100";
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const data = await res.json();
    const rows = (data && data.data && data.data.attributes && data.data.attributes.ohlcv_list) || [];
    const volumeTotal = rows.reduce((sum, row) => sum + (num(row && row[5]) || 0), 0);
    if (!rows.length) return { volumeTotal: null, feesTotal: null };
    return { volumeTotal, feesTotal: volumeTotal * 0.01 };
  } catch {
    return { volumeTotal: null, feesTotal: null };
  }
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
    volumeTotal: null,
    feesTotal: null,
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
  const [life, count] = await Promise.all([lifetime(), holders()]);
  out.volumeTotal = life.volumeTotal;
  out.feesTotal = life.feesTotal;
  out.holders = count;
  res.status(200).json(out);
};
