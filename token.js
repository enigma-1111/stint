(function () {
  window.stintToken = {
    symbol: "STINT",
    contract: "",
    chainId: 4663,
    held: false,
    live: false,
  };
  function paintWho() {
    const who = document.querySelector(".who");
    if (!who) return;
    if (window.stintName && window.stintName.currentBy) {
      const name = window.stintName.currentBy();
      who.textContent = window.stintToken.held
        ? "posted as Human \u00b7 " + name + " \u00b7 holds $STINT"
        : "posted as Human \u00b7 " + name;
    }
  }
  function paintPage() {
    const status = document.getElementById("token-status");
    if (status) {
      status.textContent = window.stintToken.live
        ? (window.stintToken.held ? "This wallet holds $STINT. Fee share, if the pool is trading, is claimed on pools.fun. Writing is still one cent." : "Connect a Robinhood Chain wallet to see if it holds $STINT. Writing still costs a penny.")
        : "No contract yet. Writing still costs a penny.";
    }
    const ca = document.getElementById("token-ca");
    if (ca) ca.textContent = window.stintToken.contract || "Not launched yet";
    const cfg = window.stintToken.cfg || {};
    const pair = document.getElementById("fact-pair");
    if (pair && cfg.pair) pair.textContent = cfg.pair;
    const supply = document.getElementById("fact-supply");
    if (supply && cfg.supply) supply.textContent = Number(cfg.supply).toLocaleString("en-US");
    const lp = document.getElementById("fact-lp");
    if (lp && cfg.lp) lp.textContent = cfg.lp;
    const pool = document.getElementById("pool-link");
    if (pool && cfg.pool) {
      pool.href = cfg.pool;
      pool.textContent = "Open the pool";
    }
    paintWho();
    if (window.stintName && window.stintName.paintBy) window.stintName.paintBy();
  }
  function pad64(hex) {
    return String(hex || "").replace(/^0x/, "").toLowerCase().padStart(64, "0");
  }
  async function balanceOf(addr, cfg) {
    if (!cfg.contract || !addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return false;
    const data = "0x70a08231" + pad64(addr);
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: cfg.contract, data: data }, "latest"],
    });
    const urls = [cfg.rpc, "https://rpc.mainnet.chain.robinhood.com"].filter(Boolean);
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body });
        const json = await res.json();
        const raw = String((json && json.result) || "0x0");
        return BigInt(raw) > 0n;
      } catch {}
    }
    return false;
  }
  async function refresh() {
    const cfg = window.stintToken;
    if (!cfg.live) {
      cfg.held = false;
      paintPage();
      return;
    }
    const addr = window.stintToken.account || "";
    cfg.held = addr ? await balanceOf(addr, cfg) : false;
    paintPage();
  }
  async function boot() {
    try {
      const cfg = await fetch("/token.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json());
      window.stintToken.symbol = cfg.symbol || "STINT";
      window.stintToken.contract = String(cfg.contract || "").trim();
      window.stintToken.chainId = Number(cfg.chainId || 4663);
      window.stintToken.rpc = cfg.rpc || "";
      window.stintToken.live = /^0x[0-9a-fA-F]{40}$/.test(window.stintToken.contract);
      window.stintToken.cfg = cfg;
    } catch {}
    paintPage();
    if (window.ethereum && window.ethereum.request) {
      try {
        const acc = await window.ethereum.request({ method: "eth_accounts" });
        window.stintToken.account = (acc && acc[0]) || "";
      } catch {}
      if (window.ethereum.on) {
        window.ethereum.on("accountsChanged", function (acc) {
          window.stintToken.account = (acc && acc[0]) || "";
          refresh();
        });
      }
    }
    refresh();
    window.addEventListener("stint-wallet", function (ev) {
      window.stintToken.account = (ev.detail && ev.detail.account) || "";
      refresh();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
