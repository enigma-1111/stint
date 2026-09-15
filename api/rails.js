const EVM_PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C".toLowerCase();
const BTC_PAYOUT = "bc1qarf9quyl9e6marnttj874urlkynplxd70th3we";
const SOL_PAYOUT = "Kaqvg1626bC9Eb7TtudPr6dhoU1qx6GXkAinMfmGFvP";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PENNY = 0.01;
const PRICE_TTL = 60 * 1000;

const g = globalThis;
if (!g.__stintPrice) g.__stintPrice = { at: 0, usd: {} };

const CHAINS = {
  robinhood: {
    id: "robinhood", family: "evm", name: "Robinhood Chain", chainId: 4663, hex: "0x1237",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://robinhood-rpc.publicnode.com", "https://rpc.mainnet.chain.robinhood.com"],
    explorer: "https://robinhoodchain.blockscout.com",
    tokens: {
      USDG: { address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6, stable: true },
    },
  },
  ethereum: {
    id: "ethereum", family: "evm", name: "Ethereum", chainId: 1, hex: "0x1",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://ethereum.publicnode.com", "https://cloudflare-eth.com"],
    explorer: "https://etherscan.io",
    tokens: {
      USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, stable: true },
      USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, stable: true },
      DAI: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, stable: true },
    },
  },
  base: {
    id: "base", family: "evm", name: "Base", chainId: 8453, hex: "0x2105",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://mainnet.base.org", "https://base.publicnode.com"],
    explorer: "https://basescan.org",
    tokens: {
      USDC: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, stable: true },
      USDT: { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6, stable: true },
    },
  },
  bnb: {
    id: "bnb", family: "evm", name: "BNB Smart Chain", chainId: 56, hex: "0x38",
    native: { symbol: "BNB", decimals: 18, priceId: "binancecoin" },
    rpc: ["https://bsc-dataseed.binance.org", "https://bsc.publicnode.com"],
    explorer: "https://bscscan.com",
    tokens: {
      USDT: { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, stable: true },
      USDC: { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, stable: true },
    },
  },
  arbitrum: {
    id: "arbitrum", family: "evm", name: "Arbitrum One", chainId: 42161, hex: "0xa4b1",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.publicnode.com"],
    explorer: "https://arbiscan.io",
    tokens: {
      USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, stable: true },
      USDT: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, stable: true },
    },
  },
  polygon: {
    id: "polygon", family: "evm", name: "Polygon", chainId: 137, hex: "0x89",
    native: { symbol: "POL", decimals: 18, priceId: "matic-network" },
    rpc: ["https://polygon-rpc.com", "https://polygon.publicnode.com"],
    explorer: "https://polygonscan.com",
    tokens: {
      USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, stable: true },
      USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, stable: true },
    },
  },
  optimism: {
    id: "optimism", family: "evm", name: "OP Mainnet", chainId: 10, hex: "0xa",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://mainnet.optimism.io", "https://optimism.publicnode.com"],
    explorer: "https://optimistic.etherscan.io",
    tokens: {
      USDC: { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, stable: true },
      USDT: { address: "0x94b008aA00579c1307B0EF2C499aD98A8ce58e58", decimals: 6, stable: true },
    },
  },
  avalanche: {
    id: "avalanche", family: "evm", name: "Avalanche C-Chain", chainId: 43114, hex: "0xa86a",
    native: { symbol: "AVAX", decimals: 18, priceId: "avalanche-2" },
    rpc: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain.publicnode.com"],
    explorer: "https://snowtrace.io",
    tokens: {
      USDC: { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6, stable: true },
      USDT: { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6, stable: true },
    },
  },
  monad: {
    id: "monad", family: "evm", name: "Monad", chainId: 143, hex: "0x8f",
    native: { symbol: "MON", decimals: 18, priceId: "monad" },
    rpc: ["https://rpc.monad.xyz", "https://monad.drpc.org"],
    explorer: "https://monadvision.com",
    tokens: {
      USDC: { address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", decimals: 6, stable: true },
      USDT: { address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D", decimals: 6, stable: true },
    },
  },
  hyperevm: {
    id: "hyperevm", family: "evm", name: "HyperEVM", chainId: 999, hex: "0x3e7",
    native: { symbol: "HYPE", decimals: 18, priceId: "hyperliquid" },
    rpc: ["https://rpc.hyperliquid.xyz/evm"],
    explorer: "https://hyperevmscan.io",
    tokens: {
      USDC: { address: "0xb88339CB7199b77E23DB6E890353E22632Ba630f", decimals: 6, stable: true },
      USDT: { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6, stable: true },
    },
  },
  linea: {
    id: "linea", family: "evm", name: "Linea", chainId: 59144, hex: "0xe708",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://rpc.linea.build"],
    explorer: "https://lineascan.build",
    tokens: {
      USDC: { address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", decimals: 6, stable: true },
    },
  },
  scroll: {
    id: "scroll", family: "evm", name: "Scroll", chainId: 534352, hex: "0x82750",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://rpc.scroll.io"],
    explorer: "https://scrollscan.com",
    tokens: {
      USDC: { address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", decimals: 6, stable: true },
      USDT: { address: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", decimals: 6, stable: true },
    },
  },
  mantle: {
    id: "mantle", family: "evm", name: "Mantle", chainId: 5000, hex: "0x1388",
    native: { symbol: "MNT", decimals: 18, priceId: "mantle" },
    rpc: ["https://rpc.mantle.xyz"],
    explorer: "https://mantlescan.xyz",
    tokens: {
      USDC: { address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", decimals: 6, stable: true },
      USDT: { address: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", decimals: 6, stable: true },
    },
  },
  gnosis: {
    id: "gnosis", family: "evm", name: "Gnosis", chainId: 100, hex: "0x64",
    native: { symbol: "xDAI", decimals: 18, priceId: "xdai" },
    rpc: ["https://rpc.gnosischain.com"],
    explorer: "https://gnosisscan.io",
    tokens: {
      USDC: { address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", decimals: 6, stable: true },
    },
  },
  worldchain: {
    id: "worldchain", family: "evm", name: "World Chain", chainId: 480, hex: "0x1e0",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://worldchain-mainnet.g.alchemy.com/public"],
    explorer: "https://worldscan.org",
    tokens: {
      USDC: { address: "0x79A02482A880bCe3F13E09da970dC34dB4cD24D1", decimals: 6, stable: true },
    },
  },
  unichain: {
    id: "unichain", family: "evm", name: "Unichain", chainId: 130, hex: "0x82",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://mainnet.unichain.org"],
    explorer: "https://uniscan.xyz",
    tokens: {
      USDC: { address: "0x078D782b760474a361dDA0AF3839290b0EF57AD6", decimals: 6, stable: true },
      USDT: { address: "0x9151434b16b9763660705744891fA906F660EcC5", decimals: 6, stable: true },
    },
  },
  ink: {
    id: "ink", family: "evm", name: "Ink", chainId: 57073, hex: "0xdef1",
    native: { symbol: "ETH", decimals: 18, priceId: "ethereum" },
    rpc: ["https://rpc-gel.inkonchain.com"],
    explorer: "https://explorer.inkonchain.com",
    tokens: {
      USDC: { address: "0x2D270e6886d130D724215A266106e6832161EAEd", decimals: 6, stable: true },
      USDT: { address: "0x0200C29006150606B650577BBE7B6248F58470c1", decimals: 6, stable: true },
    },
  },
  plasma: {
    id: "plasma", family: "evm", name: "Plasma", chainId: 9745, hex: "0x2611",
    native: { symbol: "XPL", decimals: 18, priceId: "plasma" },
    rpc: ["https://rpc.plasma.to"],
    explorer: "https://plasmascan.to",
    tokens: {
      USDC: { address: "0x2d661C89D812261039AF9764eceaAee884f5F67F", decimals: 6, stable: true },
      USDT: { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6, stable: true },
    },
  },
  sonic: {
    id: "sonic", family: "evm", name: "Sonic", chainId: 146, hex: "0x92",
    native: { symbol: "S", decimals: 18, priceId: "sonic-3" },
    rpc: ["https://rpc.soniclabs.com"],
    explorer: "https://sonicscan.org",
    tokens: {
      USDC: { address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894", decimals: 6, stable: true },
    },
  },
  celo: {
    id: "celo", family: "evm", name: "Celo", chainId: 42220, hex: "0xa4ec",
    native: { symbol: "CELO", decimals: 18, priceId: "celo" },
    rpc: ["https://forno.celo.org"],
    explorer: "https://celoscan.io",
    tokens: {
      USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6, stable: true },
    },
  },
};

const BITCOIN = {
  id: "bitcoin", family: "bitcoin", name: "Bitcoin",
  native: { symbol: "BTC", decimals: 8, priceId: "bitcoin" },
  payout: BTC_PAYOUT,
  explorer: "https://mempool.space",
};

const SOLANA = {
  id: "solana", family: "solana", name: "Solana",
  native: { symbol: "SOL", decimals: 9, priceId: "solana" },
  payout: SOL_PAYOUT,
  rpc: ["https://api.mainnet-beta.solana.com"],
  explorer: "https://solscan.io",
  tokens: {
    USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, stable: true },
    USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, stable: true },
  },
};

function evmList() {
  return Object.values(CHAINS);
}

function getChain(id) {
  const key = String(id || "robinhood").toLowerCase();
  if (key === "bitcoin" || key === "btc") return BITCOIN;
  if (key === "solana" || key === "sol") return SOLANA;
  if (key === "bsc" || key === "bnbchain") return CHAINS.bnb;
  if (key === "eth" || key === "mainnet") return CHAINS.ethereum;
  if (key === "op") return CHAINS.optimism;
  if (key === "avax") return CHAINS.avalanche;
  if (key === "matic") return CHAINS.polygon;
  if (key === "rh" || key === "hood") return CHAINS.robinhood;
  return CHAINS[key] || null;
}

function getAsset(chain, symbol) {
  if (!chain) return null;
  const s = String(symbol || "").toUpperCase();
  if (!s || s === chain.native.symbol.toUpperCase() || s === "GAS" || s === "NATIVE") {
    return { kind: "native", symbol: chain.native.symbol, decimals: chain.native.decimals, priceId: chain.native.priceId, stable: false };
  }
  const tok = chain.tokens && chain.tokens[s];
  if (!tok) return null;
  return { kind: chain.family === "solana" ? "spl" : "erc20", symbol: s, decimals: tok.decimals, stable: !!tok.stable, address: tok.address || "", mint: tok.mint || "" };
}

function usdDue(chars) {
  return Number(chars) * PENNY;
}

async function prices() {
  const now = Date.now();
  if (g.__stintPrice.at && now - g.__stintPrice.at < PRICE_TTL && g.__stintPrice.usd.ethereum) {
    return g.__stintPrice.usd;
  }
  const ids = [
    "ethereum", "bitcoin", "solana", "binancecoin", "matic-network", "avalanche-2",
    "celo", "mantle", "xdai", "hyperliquid", "monad", "sonic-3", "plasma",
  ].join(",");
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=" + ids + "&vs_currencies=usd", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("price feed down");
  const data = await res.json();
  const usd = {};
  Object.keys(data).forEach((id) => { usd[id] = Number(data[id].usd) || 0; });
  g.__stintPrice = { at: now, usd };
  return usd;
}

function unitsForUsd(usd, decimals, px) {
  if (!(px > 0)) throw new Error("no price");
  const raw = (usd / px) * Math.pow(10, decimals);
  const n = Math.ceil(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("bad amount");
  return BigInt(n);
}

async function quote(chars, railId, assetSym) {
  const chain = getChain(railId) || CHAINS.robinhood;
  const asset = getAsset(chain, assetSym) || getAsset(chain, chain.family === "evm" && chain.tokens && chain.tokens.USDG ? "USDG" : chain.native.symbol);
  if (!asset) throw new Error("unknown asset");
  const usd = usdDue(chars);
  let units;
  let px = 1;
  if (asset.stable) {
    units = BigInt(chars) * (10n ** BigInt(asset.decimals)) / 100n;
  } else {
    const feed = await prices();
    px = feed[asset.priceId];
    if (!(px > 0)) throw new Error("no " + asset.symbol + " price");
    units = unitsForUsd(usd, asset.decimals, px);
  }
  const payout = chain.family === "bitcoin" ? BTC_PAYOUT : chain.family === "solana" ? SOL_PAYOUT : EVM_PAYOUT;
  return {
    rail: chain.id,
    family: chain.family,
    name: chain.name,
    chainId: chain.chainId || null,
    asset: asset.symbol,
    kind: asset.kind,
    decimals: asset.decimals,
    usd,
    priceUsd: asset.stable ? 1 : px,
    units: units.toString(),
    payout,
    token: asset.address || asset.mint || null,
    explorer: chain.explorer,
  };
}

async function evmRpc(chain, method, params) {
  let last = new Error("rpc");
  for (const url of chain.rpc || []) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "rpc");
      return json.result;
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

function addrFromTopic(topic) {
  return ("0x" + String(topic || "").slice(-40)).toLowerCase();
}

async function verifyEvm(chain, asset, hash, chars) {
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return null;
  let rec = await evmRpc(chain, "eth_getTransactionReceipt", [hash]);
  if (!rec) {
    await new Promise((r) => setTimeout(r, 1200));
    rec = await evmRpc(chain, "eth_getTransactionReceipt", [hash]);
  }
  if (!rec || rec.status !== "0x1") return null;
  const q = await quote(chars, chain.id, asset.symbol);
  const need = BigInt(q.units);
  if (asset.kind === "native") {
    const tx = await evmRpc(chain, "eth_getTransactionByHash", [hash]);
    if (!tx || String(tx.to || "").toLowerCase() !== EVM_PAYOUT) return null;
    const amt = BigInt(tx.value || "0x0");
    if (amt < need) return null;
    return { from: String(tx.from || "").toLowerCase(), amount: amt.toString(), block: parseInt(rec.blockNumber || "0x0", 16) || 0, rail: chain.id, asset: asset.symbol };
  }
  const token = String(asset.address || "").toLowerCase();
  for (const log of rec.logs || []) {
    if (String(log.address || "").toLowerCase() !== token) continue;
    if (!log.topics || String(log.topics[0]).toLowerCase() !== TRANSFER) continue;
    if (addrFromTopic(log.topics[2]) !== EVM_PAYOUT) continue;
    const amt = BigInt(log.data || "0x0");
    if (amt >= need) {
      return { from: addrFromTopic(log.topics[1]), amount: amt.toString(), block: parseInt(rec.blockNumber || "0x0", 16) || 0, rail: chain.id, asset: asset.symbol };
    }
  }
  return null;
}

async function verifyBitcoin(hash, chars) {
  const txid = String(hash || "").replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(txid)) return null;
  const urls = [
    "https://mempool.space/api/tx/" + txid,
    "https://blockstream.info/api/tx/" + txid,
  ];
  let tx = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.ok) { tx = await res.json(); break; }
    } catch { /* next */ }
  }
  if (!tx || !Array.isArray(tx.vout)) return null;
  const q = await quote(chars, "bitcoin", "BTC");
  const need = Number(q.units);
  let paid = 0;
  for (const out of tx.vout) {
    const addr = out.scriptpubkey_address || (out.scriptpubkey_address) || "";
    if (String(addr).toLowerCase() === BTC_PAYOUT) paid += Number(out.value || 0);
  }
  if (paid < need) return null;
  const block = (tx.status && tx.status.block_height) || 0;
  return { from: "", amount: String(paid), block, rail: "bitcoin", asset: "BTC" };
}

async function solRpc(method, params) {
  const res = await fetch(SOLANA.rpc[0], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "sol rpc");
  return json.result;
}

async function verifySolana(asset, hash, chars) {
  const sig = String(hash || "").trim();
  if (sig.length < 32) return null;
  const tx = await solRpc("getTransaction", [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!tx) return null;
  const q = await quote(chars, "solana", asset.symbol);
  const need = BigInt(q.units);
  const meta = tx.meta || {};
  if (meta.err) return null;
  if (asset.kind === "native") {
    const keys = ((tx.transaction || {}).message || {}).accountKeys || [];
    const idx = keys.findIndex((k) => {
      const pk = typeof k === "string" ? k : k.pubkey;
      return pk === SOL_PAYOUT;
    });
    if (idx < 0) return null;
    const pre = BigInt((meta.preBalances && meta.preBalances[idx]) || 0);
    const post = BigInt((meta.postBalances && meta.postBalances[idx]) || 0);
    const got = post - pre;
    if (got < need) return null;
    return { from: "", amount: got.toString(), block: Number(tx.slot || 0), rail: "solana", asset: "SOL" };
  }
  const mint = asset.mint;
  const bals = [].concat(meta.preTokenBalances || [], meta.postTokenBalances || []);
  const post = (meta.postTokenBalances || []).find((b) => b.mint === mint && b.owner === SOL_PAYOUT);
  const pre = (meta.preTokenBalances || []).find((b) => b.mint === mint && b.owner === SOL_PAYOUT);
  const postAmt = BigInt(Math.round(Number((post && post.uiTokenAmount && post.uiTokenAmount.amount) || 0)));
  const preAmt = BigInt(Math.round(Number((pre && pre.uiTokenAmount && pre.uiTokenAmount.amount) || 0)));
  const got = postAmt - preAmt;
  if (!post && !bals.length) return null;
  if (got < need) return null;
  return { from: "", amount: got.toString(), block: Number(tx.slot || 0), rail: "solana", asset: asset.symbol };
}

async function verifyPay(hash, chars, railId, assetSym) {
  const chain = getChain(railId) || CHAINS.robinhood;
  const fallback = chain.family === "evm" && chain.tokens && chain.tokens.USDG ? "USDG" : chain.native.symbol;
  const asset = getAsset(chain, assetSym || fallback);
  if (!asset) return null;
  if (chain.family === "bitcoin") return verifyBitcoin(hash, chars);
  if (chain.family === "solana") return verifySolana(asset, hash, chars);
  return verifyEvm(chain, asset, hash, chars);
}

function publicCatalog() {
  return {
    evmPayout: EVM_PAYOUT,
    bitcoinPayout: BTC_PAYOUT,
    solanaPayout: SOL_PAYOUT,
    evm: evmList().map((c) => ({
      id: c.id,
      name: c.name,
      chainId: c.chainId,
      hex: c.hex,
      gas: c.native.symbol,
      rpc: c.rpc,
      explorer: c.explorer,
      stables: Object.keys(c.tokens || {}),
    })),
    bitcoin: { id: "bitcoin", payout: BTC_PAYOUT, gas: "BTC", explorer: BITCOIN.explorer },
    solana: { id: "solana", payout: SOL_PAYOUT, gas: "SOL", stables: ["USDC", "USDT"], explorer: SOLANA.explorer },
  };
}

module.exports = {
  EVM_PAYOUT,
  BTC_PAYOUT,
  SOL_PAYOUT,
  CHAINS,
  BITCOIN,
  SOLANA,
  getChain,
  getAsset,
  quote,
  verifyPay,
  publicCatalog,
  usdDue,
};
