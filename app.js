const PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const CHAIN_ID = "0x1237";
const CHAIN_DEC = 4663;
const STORE = "stint.story.v1";
const PENNY = 0.01;
const MIN_CHARS = 20;
const MAX_CHARS = 800;

const $ = (id) => document.getElementById(id);

let account = "";

function setStatus(text, ok) {
  const el = $("status");
  el.textContent = text;
  el.classList.toggle("ok", Boolean(ok));
}

function shortAddr(addr) {
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
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
}

async function usdgDecimals(ethereum) {
  try {
    const raw = await ethereum.request({
      method: "eth_call",
      params: [{ to: USDG, data: "0x313ce567" }, "latest"],
    });
    const n = parseInt(raw, 16);
    if (n >= 0 && n <= 36) return n;
  } catch {
    /* fall through */
  }
  return 6;
}

function tokenAmount(chars, decimals) {
  return BigInt(chars) * 10n ** BigInt(decimals) / 100n;
}

async function ensureChain(ethereum) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID }],
    });
  } catch (err) {
    if (err && (err.code === 4902 || /unrecognized/i.test(String(err.message || "")))) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID,
          chainName: "Robinhood Chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
          blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
        }],
      });
      return;
    }
    throw err;
  }
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(rows) {
  localStorage.setItem(STORE, JSON.stringify(rows));
}

function render(base, extra) {
  const root = $("story");
  root.innerHTML = "";
  const paras = (base && base.paragraphs) || [];
  paras.forEach((t) => {
    const p = document.createElement("p");
    p.textContent = t;
    root.appendChild(p);
  });
  extra.forEach((row) => {
    const p = document.createElement("p");
    p.className = "pending";
    p.textContent = row.text;
    root.appendChild(p);
  });
}

function paintMeter() {
  const n = charsOf($("line").value);
  $("meter").textContent = `${n} character${n === 1 ? "" : "s"} \u00b7 $${(n * PENNY).toFixed(2)}`;
}

async function loadStory() {
  const extra = loadLocal();
  try {
    const res = await fetch("story.json", { cache: "no-store" });
    const data = await res.json();
    render(data, extra);
  } catch {
    render({ paragraphs: ["The story file did not load. Write anyway."] }, extra);
  }
}

function keepLine(text, hash) {
  const n = charsOf(text);
  const rows = loadLocal();
  rows.push({
    text: text.trim(),
    hash,
    chars: n,
    usd: pennies(text),
    chain: CHAIN_DEC,
    savedAt: new Date().toISOString(),
  });
  saveLocal(rows);
  $("line").value = "";
  paintMeter();
  loadStory();
}

function getWallet() {
  if (!window.ethereum || !window.ethereum.request) {
    setStatus("No wallet in this browser.");
    return null;
  }
  return window.ethereum;
}

$("line").addEventListener("input", paintMeter);

$("connect").addEventListener("click", async () => {
  const ethereum = getWallet();
  if (!ethereum) return;
  try {
    await ensureChain(ethereum);
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = (accounts && accounts[0]) || "";
    paintWallet();
    setStatus(account ? "Connected on Robinhood Chain." : "No account.", Boolean(account));
  } catch (err) {
    setStatus(err && err.message ? err.message : "Connect declined.");
  }
});

$("pay").addEventListener("click", async () => {
  const text = $("line").value;
  const n = charsOf(text);
  if (n < MIN_CHARS) {
    setStatus(`Write at least ${MIN_CHARS} characters.`);
    return;
  }
  if (n > MAX_CHARS) {
    setStatus(`Cap is ${MAX_CHARS} characters per turn.`);
    return;
  }
  const ethereum = getWallet();
  if (!ethereum) return;
  try {
    await ensureChain(ethereum);
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = (accounts && accounts[0]) || "";
    paintWallet();
    if (!account) throw new Error("No account");
    const dec = await usdgDecimals(ethereum);
    const amt = tokenAmount(n, dec);
    const data = "0xa9059cbb" + pad64(PAYOUT) + pad64("0x" + amt.toString(16));
    const hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: account, to: USDG, data, chainId: CHAIN_ID }],
    });
    keepLine(text, hash);
    setStatus("Paid " + pennies(text).toFixed(2) + " USDG. Your lines are on this device.", true);
  } catch (err) {
    setStatus(err && err.message ? err.message : "Payment declined.");
  }
});

if (window.ethereum && window.ethereum.on) {
  window.ethereum.on("accountsChanged", (accounts) => {
    account = (accounts && accounts[0]) || "";
    paintWallet();
  });
}

paintMeter();
paintWallet();
loadStory();
