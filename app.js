const PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const CHAIN_ID = "0x1237";
const STORE = "stint.story.v1";
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
let paying = false;
let burstTimer = 0;

function setStatus(text, ok) {
  const el = $("status");
  el.textContent = text;
  el.classList.toggle("ok", Boolean(ok));
}

function shortAddr(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function charsOf(text) {
  return Array.from(text).length;
}

function pennies(text) {
  return charsOf(text) * PENNY;
}

function pad64(hex) {
  return hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

function paintWallet() {
  $("wallet-label").textContent = account ? "Connected " + shortAddr(account) : "";
  $("connect").textContent = account ? "Connected" : "Connect";
  $("pay").disabled = paying;
  $("connect").disabled = paying;
}

function filtered() {
  const q = query.trim().toLowerCase();
  if (!q) return paragraphs;
  return paragraphs.filter((p) => String(p.text || "").toLowerCase().includes(q));
}

function highlight(src, q) {
  const p = document.createElement("p");
  const low = src.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (i < src.length) {
    const hit = low.indexOf(needle, i);
    if (hit < 0) {
      p.appendChild(document.createTextNode(src.slice(i)));
      break;
    }
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
    p.textContent = query ? "No lines match that search." : "The story is still opening.";
    root.appendChild(p);
  } else {
    slice.forEach((row) => {
      const p = query ? highlight(String(row.text || ""), query) : document.createElement("p");
      if (!query) p.textContent = row.text;
      if (row.pending) p.classList.add("pending");
      root.appendChild(p);
    });
  }
  $("pager").textContent = rows.length
    ? "Page " + page + " of " + pages + " · " + rows.length + " passages"
    : "";
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
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(rows) {
  localStorage.setItem(STORE, JSON.stringify(rows));
}

function mergeRows(remote) {
  const seen = new Set();
  const out = [];
  remote.forEach((row) => {
    const text = String(row.text || "");
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, pending: false, hash: row.hash || "" });
  });
  localRows().forEach((row) => {
    const text = String(row.text || "");
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, pending: true, hash: row.hash || "" });
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
  try {
    const data = await fetchJson("/api/story?t=" + Date.now());
    remote = data.paragraphs || [];
  } catch {
    remote = [];
  }
  if (!remote.length) {
    try {
      const data = await fetchJson("story.json?t=" + Date.now());
      remote = (data.paragraphs || []).map((text) => ({ text, pending: false }));
    } catch {
      remote = OPENING.map((text) => ({ text, pending: false }));
    }
  }
  if (!remote.length) remote = OPENING.map((text) => ({ text, pending: false }));
  paragraphs = mergeRows(remote);
  if (goLast) page = Math.max(1, Math.ceil(filtered().length / PAGE));
  renderStory();
}

async function usdgDecimals(eth) {
  try {
    const raw = await eth.request({
      method: "eth_call",
      params: [{ to: USDG, data: "0x313ce567" }, "latest"],
    });
    const n = parseInt(raw, 16);
    if (n >= 0 && n <= 36) return n;
  } catch {
    /* ignore */
  }
  return 6;
}

function tokenAmount(chars, decimals) {
  return BigInt(chars) * 10n ** BigInt(decimals) / 100n;
}

async function ensureChain(eth) {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID }],
    });
  } catch (err) {
    if (err && (err.code === 4902 || /unrecognized/i.test(String(err.message || "")))) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID,
          chainName: "Robinhood Chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [
            "https://rpc.mainnet.chain.robinhood.com",
            "https://robinhood-rpc.publicnode.com",
          ],
          blockExplorerUrls: ["https://explorer.robinhood.com"],
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

async function publish(text, hash) {
  const rows = localRows();
  if (!rows.some((r) => r.hash === hash)) {
    rows.push({
      text: text.trim(),
      hash,
      chars: charsOf(text),
      usd: pennies(text),
      savedAt: new Date().toISOString(),
    });
    saveLocal(rows);
  }
  let last = null;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, hash }),
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
    eth.on("accountsChanged", (accounts) => {
      account = (accounts && accounts[0]) || "";
      paintWallet();
    });
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

function openModal() {
  paintModal();
  $("modal").hidden = false;
}

function closeModal() {
  $("modal").hidden = true;
}

async function connectWith(eth, name) {
  rememberProvider(eth);
  try {
    await ensureChain(eth);
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

window.addEventListener("eip6963:announceProvider", (event) => {
  const detail = event.detail || {};
  const info = detail.info;
  const p = detail.provider;
  if (!info || !p) return;
  discovered.set(info.uuid || info.rdns || info.name, { info, provider: p });
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

$("line").addEventListener("input", () => {
  const n = charsOf($("line").value);
  $("meter").textContent = n + " characters · $" + (n * PENNY).toFixed(2);
});

$("search").addEventListener("input", () => {
  query = $("search").value;
  page = 1;
  renderStory();
});

$("connect").addEventListener("click", () => {
  const wallets = collectWallets();
  if (wallets.length === 1 && !/iPhone|iPad|Android/i.test(navigator.userAgent)) {
    connectWith(wallets[0].provider, wallets[0].name);
    return;
  }
  openModal();
});

$("modal-close").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

$("pay").addEventListener("click", async () => {
  if (paying) return;
  const text = $("line").value;
  const n = charsOf(text);
  if (n < MIN_CHARS) {
    setStatus("Write at least " + MIN_CHARS + " characters.");
    return;
  }
  if (n > MAX_CHARS) {
    setStatus("Cap is " + MAX_CHARS + " characters per turn.");
    return;
  }
  const wallets = collectWallets();
  const eth = provider || (wallets[0] && wallets[0].provider);
  if (!eth || !eth.request) {
    openModal();
    setStatus("Connect a wallet first.");
    return;
  }
  rememberProvider(eth);
  paying = true;
  paintWallet();
  try {
    await ensureChain(eth);
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    account = (accounts && accounts[0]) || "";
    paintWallet();
    if (!account) throw new Error("No account");
    setStatus("Confirm the USDG payment in your wallet.");
    const dec = await usdgDecimals(eth);
    const amt = tokenAmount(n, dec);
    const data = "0xa9059cbb" + pad64(PAYOUT) + pad64("0x" + amt.toString(16));
    const hash = await eth.request({
      method: "eth_sendTransaction",
      params: [{ from: account, to: USDG, data, chainId: CHAIN_ID }],
    });
    setStatus("Waiting for the payment to land…");
    await waitReceipt(eth, hash);
    setStatus("Payment landed. Publishing your lines…");
    await publish(text, hash);
    $("line").value = "";
    $("meter").textContent = "0 characters · $0.00";
    await loadStory(true);
    startBurst();
    setStatus("Paid " + pennies(text).toFixed(2) + " USDG. Story reloaded.", true);
  } catch (err) {
    setStatus(err && err.message ? err.message : "Payment declined.");
  } finally {
    paying = false;
    paintWallet();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadStory(false);
});
window.addEventListener("pageshow", () => loadStory(false));
setInterval(() => loadStory(false), 8000);

paintWallet();
loadStory(false);
