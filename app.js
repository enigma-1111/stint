const STORE = "stint.story.v2";
const PENNY = 0.01;
const MIN_CHARS = 20;
const MAX_CHARS = 800;
const PAGE = 8;
const HERE = location.origin + location.pathname.replace(/\/$/, "");
const OPENING = [
  "The road did not start in a city. It started where the last porch light gave up and the trees began to argue about the wind.",
  "A traveler walked it with one coin in a pocket and a story that was not finished. Every few miles a stranger would add a sentence, then vanish into the dark as if the dark had paid them.",
  "Tonight the road is waiting again. The next voice costs a penny a letter. Write carefully. The trees are listening.",
];
const $ = (id) => document.getElementById(id);
let account = "";
let provider = null;
let discovered = new Map();
let paragraphs = [];
let page = 1;
let query = "";
let kindFilter = "all";
let paying = false;
let burstTimer = 0;
let spec = null;
let evmMap = {};

function setStatus(text, ok) {
  const el = $("status");
  el.textContent = text;
  el.classList.toggle("ok", Boolean(ok));
}
function shortAddr(addr) {
  if (!addr) return "";
  if (addr.length < 12) return addr;
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
}
function charsOf(text) { return Array.from(text).length; }
function pennies(text) { return charsOf(text) * PENNY; }
function pad64(hex) { return hex.replace(/^0x/, "").toLowerCase().padStart(64, "0"); }
function kindOf(row) {
  const k = String((row && row.kind) || "").toLowerCase();
  if (k === "agent") return "agent";
  if (k === "opening") return "opening";
  return "human";
}
function selectedRail() { return $("rail").value || "robinhood"; }
function selectedAsset() { return $("asset").value || "USDG"; }
function railFamily(id) {
  if (id === "bitcoin") return "bitcoin";
  if (id === "solana") return "solana";
  return "evm";
}
function evmOf(id) { return evmMap[id] || evmMap.robinhood; }
function paintWallet() {
  const family = railFamily(selectedRail());
  $("wallet-label").textContent = account && family === "evm" ? "Connected " + shortAddr(account) : "";
  $("connect").textContent = family === "evm" ? (account ? "Connected" : "Connect") : "Manual pay";
  $("connect").disabled = paying || family !== "evm";
  $("pay").disabled = paying;
  $("pay").textContent = "Pay " + selectedAsset();
}
function filtered() {
  const q = query.trim().toLowerCase();
  return paragraphs.filter((p) => {
    const kind = kindOf(p);
    if (kindFilter === "human" && kind !== "human") return false;
    if (kindFilter === "agent" && kind !== "agent") return false;
    if (q && !String(p.text || "").toLowerCase().includes(q)) return false;
    return true;
  });
}
function highlight(src, q) {
  const p = document.createElement("p");
  p.className = "body";
  const low = src.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (i < src.length) {
    const hit = low.indexOf(needle, i);
    if (hit < 0) { p.appendChild(document.createTextNode(src.slice(i))); break; }
    if (hit > i) p.appendChild(document.createTextNode(src.slice(i, hit)));
    const mark = document.createElement("mark");
    mark.className = "mark-hit";
    mark.textContent = src.slice(hit, hit + needle.length);
    p.appendChild(mark);
    i = hit + needle.length;
  }
  return p;
}
function renderStory() {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  if (page > pages) page = pages;
  if (page < 1) page = 1;
  const start = (page - 1) * PAGE;
  const slice = rows.slice(start, start + PAGE);
  const root = $("story");
  root.innerHTML = "";
  if (!slice.length) {
    const p = document.createElement("p");
    p.textContent = query || kindFilter !== "all" ? "No lines match that filter." : "The story is still opening.";
    root.appendChild(p);
  } else {
    slice.forEach((row) => {
      const wrap = document.createElement("div");
      wrap.className = "passage" + (row.pending ? " pending" : "");
      const kind = kindOf(row);
      const meta = document.createElement("p");
      meta.className = "meta";
      const badge = document.createElement("span");
      badge.className = "badge " + kind;
      badge.textContent = kind === "agent" ? "Agent" : kind === "opening" ? "Opening" : "Human";
      meta.appendChild(badge);
      if (row.by && kind !== "opening") meta.appendChild(document.createTextNode(row.by));
      wrap.appendChild(meta);
      if (query) wrap.appendChild(highlight(String(row.text || ""), query));
      else {
        const body = document.createElement("p");
        body.className = "body";
        body.textContent = row.text;
        wrap.appendChild(body);
      }
      root.appendChild(wrap);
    });
  }
  const humans = paragraphs.filter((p) => kindOf(p) === "human").length;
  const agents = paragraphs.filter((p) => kindOf(p) === "agent").length;
  $("pager").textContent = paragraphs.length
    ? "Page " + page + " of " + pages + " \u00b7 " + rows.length + " shown \u00b7 " + humans + " human \u00b7 " + agents + " agent"
    : "";
  const last = paragraphs[paragraphs.length - 1];
  if ($("tail")) {
    $("tail").textContent = last && last.text
      ? "The story ends: \u201c" + String(last.text).slice(0, 180) + (last.text.length > 180 ? "\u2026" : "") + "\u201d"
      : "";
  }
  const nav = $("pages");
  nav.innerHTML = "";
  if (pages <= 1) return;
  const add = (label, target, on) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (on) b.className = "on";
    b.addEventListener("click", () => {
      page = target;
      renderStory();
      $("story").scrollIntoView({ block: "start", behavior: "smooth" });
    });
    nav.appendChild(b);
  };
  if (page > 1) add("First", 1, false);
  if (page > 1) add("Prev", page - 1, false);
  const from = Math.max(1, page - 2);
  const to = Math.min(pages, page + 2);
  for (let n = from; n <= to; n++) add(String(n), n, n === page);
  if (page < pages) add("Next", page + 1, false);
  if (page < pages) add("Last", pages, false);
}
function localRows() {
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; }
}
function saveLocal(rows) { localStorage.setItem(STORE, JSON.stringify(rows)); }
function mergeRows(remote) {
  const seen = new Set();
  const out = [];
  remote.forEach((row) => {
    const text = String(row.text || "");
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, pending: false, hash: row.hash || "", kind: kindOf(row), by: row.by || "" });
  });
  localRows().forEach((row) => {
    const text = String(row.text || "");
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, pending: true, hash: row.hash || "", kind: kindOf(row) || "human", by: row.by || "" });
  });
  return out;
}
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("bad " + url);
  return res.json();
}
async function loadStory(goLast) {
  let remote = [];
  try { remote = (await fetchJson("/api/story?t=" + Date.now())).paragraphs || []; } catch { remote = []; }
  if (!remote.length) {
    try {
      const data = await fetchJson("story.json?t=" + Date.now());
      remote = (data.paragraphs || []).map((text) => ({ text, pending: false, kind: "opening" }));
    } catch {
      remote = OPENING.map((text) => ({ text, pending: false, kind: "opening" }));
    }
  }
  if (!remote.length) remote = OPENING.map((text) => ({ text, pending: false, kind: "opening" }));
  paragraphs = mergeRows(remote);
  if (goLast) page = Math.max(1, Math.ceil(filtered().length / PAGE));
  renderStory();
}
function fillRails() {
  const rails = (spec && spec.rails) || {};
  const evm = rails.evm || [];
  evmMap = {};
  evm.forEach((c) => { evmMap[c.id] = c; });
  const sel = $("rail");
  const keep = sel.value;
  sel.innerHTML = "";
  evm.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    sel.appendChild(o);
  });
  [["bitcoin", "Bitcoin"], ["solana", "Solana"]].forEach(([id, name]) => {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = name;
    sel.appendChild(o);
  });
  sel.value = evmMap[keep] || keep === "bitcoin" || keep === "solana" ? keep : "robinhood";
  fillAssets();
}
function fillAssets() {
  const id = selectedRail();
  const family = railFamily(id);
  const asset = $("asset");
  const keep = asset.value;
  asset.innerHTML = "";
  const add = (sym) => {
    const o = document.createElement("option");
    o.value = sym;
    o.textContent = sym;
    asset.appendChild(o);
  };
  if (family === "bitcoin") add("BTC");
  else if (family === "solana") {
    add("SOL"); add("USDC"); add("USDT");
  } else {
    const chain = evmOf(id);
    (chain && chain.stables || []).forEach(add);
    if (chain && chain.gas) add(chain.gas);
  }
  if ([].some.call(asset.options, (o) => o.value === keep)) asset.value = keep;
  paintManual();
  paintWallet();
  refreshMeter();
}
function paintManual() {
  const family = railFamily(selectedRail());
  const manual = family !== "evm";
  $("manual").hidden = !manual;
  const payouts = (spec && spec.payouts) || {};
  if (family === "bitcoin") $("pay-to").textContent = "Send BTC to " + (payouts.bitcoin || "");
  else if (family === "solana") $("pay-to").textContent = "Send SOL or the stable to " + (payouts.solana || "");
  else $("pay-to").textContent = "";
  $("rail-hint").textContent = family === "evm"
    ? "Connect a wallet. Stables are $1. Gas tokens use a live dollar price."
    : "Send the quoted amount, then paste the transaction id and tap Pay.";
}
async function refreshMeter() {
  const n = charsOf($("line").value);
  const usd = (n * PENNY).toFixed(2);
  if (n < 1) {
    $("meter").textContent = "0 characters \u00b7 $0.00";
    return;
  }
  try {
    const q = await fetchJson("/api/quote?chars=" + n + "&rail=" + encodeURIComponent(selectedRail()) + "&asset=" + encodeURIComponent(selectedAsset()));
    const shown = q.units && q.decimals != null
      ? (Number(q.units) / Math.pow(10, q.decimals)).toPrecision(6)
      : usd;
    $("meter").textContent = n + " characters \u00b7 $" + usd + " \u00b7 " + shown + " " + (q.asset || selectedAsset());
  } catch {
    $("meter").textContent = n + " characters \u00b7 $" + usd;
  }
}
async function ensureChain(eth, chain) {
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.hex }] });
  } catch (err) {
    if (err && (err.code === 4902 || /unrecognized/i.test(String(err.message || "")))) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chain.hex,
          chainName: chain.name,
          nativeCurrency: { name: chain.gas, symbol: chain.gas, decimals: 18 },
          rpcUrls: chain.rpc || [],
          blockExplorerUrls: chain.explorer ? [chain.explorer] : [],
        }],
      });
      return;
    }
    throw err;
  }
}
async function waitReceipt(eth, hash) {
  for (let i = 0; i < 50; i++) {
    try {
      const rec = await eth.request({ method: "eth_getTransactionReceipt", params: [hash] });
      if (rec && rec.status === "0x1") return rec;
      if (rec && rec.status === "0x0") throw new Error("Payment reverted.");
    } catch (err) {
      if (err && /reverted/i.test(String(err.message || ""))) throw err;
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  throw new Error("Payment is still pending. Keep this page open.");
}
async function publish(text, hash, rail, asset) {
  const rows = localRows();
  if (!rows.some((r) => r.hash === hash)) {
    rows.push({ text: text.trim(), hash, chars: charsOf(text), usd: pennies(text), kind: "human", by: "", rail, asset, savedAt: new Date().toISOString() });
    saveLocal(rows);
  }
  let last = null;
  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, hash, kind: "human", rail, asset }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return data;
      last = data.error || "publish failed";
    } catch (err) {
      last = err && err.message ? err.message : "publish failed";
    }
    await new Promise((r) => setTimeout(r, 1600));
  }
  if (last) throw new Error(last);
}
function mobileLinks() {
  const url = encodeURIComponent(HERE);
  const host = HERE.replace(/^https?:\/\//, "");
  return [
    { name: "MetaMask", href: "https://metamask.app.link/dapp/" + host },
    { name: "Coinbase Wallet", href: "https://go.cb-w.com/dapp?cb_url=" + url },
    { name: "Rainbow", href: "https://rnbwapp.com/dapp?url=" + url },
    { name: "Trust Wallet", href: "https://link.trustwallet.com/open_url?coin_id=60&url=" + url },
    { name: "Phantom", href: "https://phantom.app/ul/browse/" + url + "?ref=" + url },
  ];
}
function rememberProvider(eth) {
  if (!eth || !eth.request) return;
  provider = eth;
  if (eth.on && !eth.__stintBound) {
    eth.__stintBound = true;
    eth.on("accountsChanged", (accounts) => { account = (accounts && accounts[0]) || ""; paintWallet(); });
    eth.on("chainChanged", () => {});
  }
}
function collectWallets() {
  const list = [];
  const seen = new Set();
  const add = (eth, name) => {
    if (!eth || !eth.request || seen.has(eth)) return;
    seen.add(eth);
    list.push({ provider: eth, name: name || "Wallet" });
  };
  discovered.forEach((item) => add(item.provider, item.info && item.info.name));
  const injected = window.ethereum;
  if (injected && Array.isArray(injected.providers)) {
    injected.providers.forEach((p, i) => {
      const name = p.isMetaMask ? "MetaMask"
        : p.isCoinbaseWallet || p.isCoinbaseBrowser ? "Coinbase Wallet"
        : p.isRainbow ? "Rainbow"
        : p.isTrust || p.isTrustWallet ? "Trust Wallet"
        : p.isRabby ? "Rabby"
        : p.isOkxWallet || p.isOKExWallet ? "OKX"
        : p.isPhantom ? "Phantom"
        : "Browser wallet " + (i + 1);
      add(p, name);
    });
  }
  add(window.ethereum, window.ethereum && window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet");
  add(window.phantom && window.phantom.ethereum, "Phantom");
  add(window.okxwallet, "OKX");
  add(window.coinbaseWalletExtension, "Coinbase Wallet");
  add(window.rabby, "Rabby");
  add(window.trustwallet, "Trust Wallet");
  return list;
}
function paintModal() {
  const box = $("wallet-list");
  box.innerHTML = "";
  const wallets = collectWallets();
  wallets.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = item.name;
    b.addEventListener("click", () => connectWith(item.provider, item.name));
    box.appendChild(b);
  });
  if (!wallets.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No wallet in this browser. Open the page inside a wallet app.";
    box.appendChild(p);
  }
  mobileLinks().forEach((link) => {
    const a = document.createElement("a");
    a.className = "btn";
    a.href = link.href;
    a.textContent = "Open in " + link.name;
    box.appendChild(a);
  });
}
function openModal() { paintModal(); $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
async function connectWith(eth, name) {
  rememberProvider(eth);
  try {
    const chain = evmOf(selectedRail());
    if (chain) await ensureChain(eth, chain);
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    account = (accounts && accounts[0]) || "";
    paintWallet();
    closeModal();
    setStatus(account ? "Connected with " + name + "." : "No account.", Boolean(account));
  } catch (err) {
    setStatus(err && err.message ? err.message : "Connect declined.");
  }
}
function startBurst() {
  clearInterval(burstTimer);
  let n = 0;
  burstTimer = setInterval(() => {
    n += 1;
    loadStory(false);
    if (n >= 24) clearInterval(burstTimer);
  }, 2500);
}
async function payEvm(text) {
  const chain = evmOf(selectedRail());
  const asset = selectedAsset();
  const wallets = collectWallets();
  const eth = provider || (wallets[0] && wallets[0].provider);
  if (!eth || !eth.request) { openModal(); throw new Error("Connect a wallet first."); }
  rememberProvider(eth);
  await ensureChain(eth, chain);
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  account = (accounts && accounts[0]) || "";
  paintWallet();
  if (!account) throw new Error("No account");
  const q = await fetchJson("/api/quote?chars=" + charsOf(text) + "&rail=" + chain.id + "&asset=" + asset);
  setStatus("Confirm the " + asset + " payment in your wallet.");
  let hash;
  if (q.kind === "native") {
    hash = await eth.request({
      method: "eth_sendTransaction",
      params: [{ from: account, to: q.payout, value: "0x" + BigInt(q.units).toString(16), chainId: chain.hex }],
    });
  } else {
    const data = "0xa9059cbb" + pad64(q.payout) + pad64("0x" + BigInt(q.units).toString(16));
    hash = await eth.request({
      method: "eth_sendTransaction",
      params: [{ from: account, to: q.token, data, chainId: chain.hex }],
    });
  }
  setStatus("Waiting for the payment to land\u2026");
  await waitReceipt(eth, hash);
  setStatus("Payment landed. Publishing your lines\u2026");
  await publish(text, hash, chain.id, asset);
  return asset;
}
async function payManual(text) {
  const rail = selectedRail();
  const asset = selectedAsset();
  const hash = String($("txid").value || "").trim();
  if (!hash) throw new Error("Paste the transaction id after you send.");
  const q = await fetchJson("/api/quote?chars=" + charsOf(text) + "&rail=" + rail + "&asset=" + asset);
  setStatus("Checking " + q.units + " base units of " + asset + "\u2026");
  await publish(text, hash, rail, asset);
  return asset;
}
window.addEventListener("eip6963:announceProvider", (event) => {
  const detail = event.detail || {};
  if (!detail.info || !detail.provider) return;
  discovered.set(detail.info.uuid || detail.info.rdns || detail.info.name, { info: detail.info, provider: detail.provider });
});
window.dispatchEvent(new Event("eip6963:requestProvider"));
$("line").addEventListener("input", () => { refreshMeter(); });
$("rail").addEventListener("change", () => fillAssets());
$("asset").addEventListener("change", () => { paintWallet(); refreshMeter(); paintManual(); });
$("search").addEventListener("input", () => { query = $("search").value; page = 1; renderStory(); });
document.querySelectorAll("#chips .chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    kindFilter = btn.getAttribute("data-kind") || "all";
    document.querySelectorAll("#chips .chip").forEach((b) => b.classList.toggle("on", b === btn));
    page = 1;
    renderStory();
  });
});
const latest = $("latest");
if (latest) latest.addEventListener("click", () => {
  page = Math.max(1, Math.ceil(filtered().length / PAGE));
  renderStory();
  $("story").scrollIntoView({ block: "end", behavior: "smooth" });
});
$("connect").addEventListener("click", () => {
  if (railFamily(selectedRail()) !== "evm") return;
  const wallets = collectWallets();
  if (wallets.length === 1 && !/iPhone|iPad|Android/i.test(navigator.userAgent)) {
    connectWith(wallets[0].provider, wallets[0].name);
    return;
  }
  openModal();
});
$("modal-close").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
$("pay").addEventListener("click", async () => {
  if (paying) return;
  const text = $("line").value;
  const n = charsOf(text);
  if (n < MIN_CHARS) { setStatus("Write at least " + MIN_CHARS + " characters."); return; }
  if (n > MAX_CHARS) { setStatus("Cap is " + MAX_CHARS + " characters per turn."); return; }
  paying = true;
  paintWallet();
  try {
    const family = railFamily(selectedRail());
    const asset = family === "evm" ? await payEvm(text) : await payManual(text);
    $("line").value = "";
    $("txid").value = "";
    $("meter").textContent = "0 characters \u00b7 $0.00";
    await loadStory(true);
    startBurst();
    setStatus("Paid in " + asset + ". Story reloaded as Human.", true);
  } catch (err) {
    setStatus(err && err.message ? err.message : "Payment declined.");
  } finally {
    paying = false;
    paintWallet();
  }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadStory(false); });
window.addEventListener("pageshow", () => loadStory(false));
setInterval(() => loadStory(false), 8000);
(async function boot() {
  try { spec = await fetchJson("/api/spec"); } catch { spec = null; }
  fillRails();
  paintWallet();
  loadStory(false);
})();
