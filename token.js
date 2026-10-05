(function () {
  window.stintToken = { symbol: "STINT", contract: "", chainId: 4663, held: false, live: false };
  function money(n) {
    if (n == null || !Number.isFinite(Number(n))) return "\u2014";
    const v = Number(n);
    if (v >= 1000) return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (v >= 1) return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (v === 0) return "$0";
    return "$" + v.toPrecision(3);
  }
  function paintStats(s) {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    if (!s) return;
    set("stat-price", money(s.priceUsd));
    const chg = s.change24h == null ? "\u2014" : (s.change24h > 0 ? "+" : "") + Number(s.change24h).toFixed(2) + "%";
    set("stat-chg", "24h " + chg);
    set("stat-mcap", money(s.marketCap));
    set("stat-liq", money(s.liquidityUsd));
    set("stat-vol", money(s.volume24h));
    const buys = s.buys24h == null ? null : Number(s.buys24h);
    const sells = s.sells24h == null ? null : Number(s.sells24h);
    set("stat-trades", buys == null && sells == null ? "\u2014" : (buys || 0) + " buys \u00b7 " + (sells || 0) + " sells");
    const row = document.getElementById("holders-row");
    if (row) row.hidden = s.holders == null;
    set("stat-holders", s.holders == null ? "\u2014" : String(s.holders));
    const fees = s.volume24h == null ? null : Number(s.volume24h) * 0.01;
    set("stat-fees", money(fees));
    set("stat-holder-cut", fees == null ? "\u2014" : money(fees * 0.9));
  }
  function paintPage() {
    const status = document.getElementById("token-status");
    if (status) status.textContent = window.stintToken.held ? "This wallet holds $STINT. A paid line from it can wear the gold mark. Claim any pool share on the pool. Writing is still one cent." : "Connect a Robinhood Chain wallet to see if it holds $STINT.";
    const ca = document.getElementById("token-ca");
    if (ca && window.stintToken.contract) ca.textContent = window.stintToken.contract;
    document.querySelectorAll("a[href*='pools.fun']").forEach(function (a) { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  }
  function pad64(hex) { return String(hex || "").replace(/^0x/, "").toLowerCase().padStart(64, "0"); }
  async function balanceOf(addr, cfg) {
    if (!cfg.contract || !addr) return false;
    const data = "0x70a08231" + pad64(addr);
    try {
      const res = await fetch(cfg.rpc || "https://rpc.mainnet.chain.robinhood.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: cfg.contract, data: data }, "latest"] }) });
      const json = await res.json();
      return BigInt(String((json && json.result) || "0x0")) > 0n;
    } catch { return false; }
  }
  async function refresh() {
    window.stintToken.held = window.stintToken.live && window.stintToken.account ? await balanceOf(window.stintToken.account, window.stintToken) : false;
    paintPage();
  }
  async function loadStats() {
    try { paintStats(await fetch("/api/token-stats?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json())); } catch {}
  }
  function copyCa() {
    const ca = (document.getElementById("token-ca") || {}).textContent || "";
    const btn = document.getElementById("copy-ca");
    if (!ca || !navigator.clipboard) return;
    navigator.clipboard.writeText(ca.trim()).then(function () {
      if (!btn) return;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy contract"; }, 1400);
    }).catch(function () {});
  }
  async function boot() {
    try {
      const cfg = await fetch("/token.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json());
      window.stintToken.contract = String(cfg.contract || "").trim();
      window.stintToken.rpc = cfg.rpc || "";
      window.stintToken.live = /^0x[0-9a-fA-F]{40}$/.test(window.stintToken.contract);
    } catch {}
    const copy = document.getElementById("copy-ca");
    if (copy) copy.addEventListener("click", copyCa);
    paintPage();
    loadStats();
    setInterval(loadStats, 60000);
    if (window.ethereum && window.ethereum.request) {
      try { const acc = await window.ethereum.request({ method: "eth_accounts" }); window.stintToken.account = (acc && acc[0]) || ""; } catch {}
      if (window.ethereum.on) window.ethereum.on("accountsChanged", function (acc) { window.stintToken.account = (acc && acc[0]) || ""; refresh(); });
    }
    refresh();
    window.addEventListener("stint-wallet", function (ev) { window.stintToken.account = (ev.detail && ev.detail.account) || ""; refresh(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
