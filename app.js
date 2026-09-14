const PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C";
const STORE = "stint.v1";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const hintEl = $("pay-hint");

let sku = "rewrite";
let eth = "0.01";

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", Boolean(ok));
}

function weiFromEth(amount) {
  const [w, frac = ""] = String(amount).split(".");
  const fracPad = (frac + "000000000000000000").slice(0, 18);
  return "0x" + BigInt(w + fracPad).toString(16);
}

document.querySelectorAll(".sku").forEach((btn) => {
  if (btn.dataset.sku === sku) btn.classList.add("on");
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sku").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    sku = btn.dataset.sku;
    eth = btn.dataset.eth;
    hintEl.textContent = `Send ${eth} ETH to the address for ${sku}. Same address on Ethereum and other EVM chains.`;
  });
});

$("copy-addr").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(PAYOUT);
    setStatus("Address copied.", true);
  } catch {
    setStatus("Copy failed. Select the address and copy it yourself.");
  }
});

$("wallet-send").addEventListener("click", async () => {
  const ethereum = window.ethereum;
  if (!ethereum || !ethereum.request) {
    setStatus("No wallet in this browser. Copy the address and send from your wallet app.");
    return;
  }
  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const from = accounts && accounts[0];
    if (!from) throw new Error("no account");
    const hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from, to: PAYOUT, value: weiFromEth(eth) }],
    });
    $("hash").value = hash;
    setStatus("Wallet sent. Hash filled in. Save the stint.", true);
    persist();
  } catch (err) {
    const msg = err && err.message ? err.message : "Wallet declined.";
    setStatus(msg);
  }
});

function persist() {
  const rec = {
    sku,
    eth,
    payout: PAYOUT,
    brief: $("brief").value.trim(),
    hash: $("hash").value.trim(),
    reply: $("reply").value.trim(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORE, JSON.stringify(rec));
  return rec;
}

$("save").addEventListener("click", () => {
  const rec = persist();
  if (!rec.hash || !rec.hash.startsWith("0x") || rec.hash.length < 66) {
    setStatus("Need a full transaction hash (0x and 64 hex chars) before this is a paid stint.");
    return;
  }
  if (!rec.brief) {
    setStatus("Add what the page should be about.");
    return;
  }
  setStatus(`Saved ${rec.sku} at ${rec.eth} ETH. Work starts after that hash is real. Keep this tab or screenshot it.`, true);
});

try {
  const raw = localStorage.getItem(STORE);
  if (raw) {
    const rec = JSON.parse(raw);
    if (rec.brief) $("brief").value = rec.brief;
    if (rec.hash) $("hash").value = rec.hash;
    if (rec.reply) $("reply").value = rec.reply;
    if (rec.sku && rec.eth) {
      sku = rec.sku;
      eth = rec.eth;
      document.querySelectorAll(".sku").forEach((b) => {
        b.classList.toggle("on", b.dataset.sku === sku);
      });
    }
  }
} catch {
  /* ignore broken local store */
}
