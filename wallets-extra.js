/* Loaded after app.js. Reorders networks and appends MetaMask / Zerion. */
(function () {
  function railSel() { return document.getElementById("rail"); }
  function familyOf(id) {
    if (id === "bitcoin") return "bitcoin";
    if (id === "solana") return "solana";
    return "evm";
  }
  function firstAddr(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return firstAddr(value[0]);
    if (value.address) return value.address;
    if (value.publicKey) return String(value.publicKey);
    if (value.result) return firstAddr(value.result);
    return "";
  }
  function metamaskSol() {
    return (window.ethereum && window.ethereum.isMetaMask && (window.ethereum.solana || window.ethereum._metamask && window.ethereum.solana)) ||
      (window.metamask && (window.metamask.solana || window.metamask.solanaProvider)) ||
      null;
  }
  function metamaskBtc() {
    return (window.ethereum && window.ethereum.isMetaMask && window.ethereum.bitcoin) ||
      (window.metamask && (window.metamask.bitcoin || window.metamask.btc)) ||
      null;
  }
  function zerionSol() {
    return window.zerionSolana ||
      (window.zerion && (window.zerion.solana || window.zerion.solanaProvider)) ||
      (window.zerionWallet && window.zerionWallet.solana) ||
      null;
  }
  function zerionBtc() {
    return (window.zerion && (window.zerion.bitcoin || window.zerion.btc)) ||
      (window.zerionWallet && window.zerionWallet.bitcoin) ||
      null;
  }
  function addBtn(box, name, fn) {
    if ([].some.call(box.querySelectorAll("button, a"), function (el) { return el.textContent === name; })) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = name;
    b.addEventListener("click", fn);
    var close = document.getElementById("modal-close");
    box.insertBefore(b, close);
  }
  function reorder() {
    var sel = railSel();
    if (!sel || !sel.options.length) return false;
    var map = {};
    [].forEach.call(sel.options, function (o) { map[o.value] = o; });
    var head = ["ethereum", "bitcoin", "solana"];
    var rest = [].map.call(sel.options, function (o) { return o.value; }).filter(function (id) { return head.indexOf(id) < 0; });
    var keep = sel.value;
    sel.innerHTML = "";
    head.concat(rest).forEach(function (id) {
      if (map[id]) sel.appendChild(map[id]);
    });
    if (keep && map[keep]) sel.value = keep;
    else if (map.ethereum) sel.value = "ethereum";
    sel.dispatchEvent(new Event("change"));
    return true;
  }
  function enhanceModal() {
    var box = document.getElementById("wallet-list");
    var sel = railSel();
    if (!box || !sel) return;
    var fam = familyOf(sel.value);
    var host = location.host;
    var url = encodeURIComponent(location.origin + location.pathname.replace(/\/$/, ""));
    if (fam === "solana") {
      if (metamaskSol()) addBtn(box, "MetaMask Solana", function () {
        var api = metamaskSol();
        Promise.resolve(api.connect ? api.connect() : api.request({ method: "connect" })).then(function (res) {
          if (!firstAddr(res) && !(api.publicKey)) throw new Error("No Solana account");
        }).catch(function (err) { console.warn(err); });
      });
      if (zerionSol()) addBtn(box, "Zerion Solana", function () {
        var api = zerionSol();
        Promise.resolve(api.connect ? api.connect() : api.request({ method: "connect" })).catch(function (err) { console.warn(err); });
      });
      if (![].some.call(box.querySelectorAll("a"), function (a) { return /MetaMask/.test(a.textContent); })) {
        var a = document.createElement("a");
        a.className = "btn";
        a.href = "https://metamask.app.link/dapp/" + host;
        a.textContent = "Open in MetaMask";
        box.appendChild(a);
      }
      if (![].some.call(box.querySelectorAll("a"), function (a) { return /Zerion/.test(a.textContent); })) {
        var z = document.createElement("a");
        z.className = "btn";
        z.href = "https://link.zerion.io/dapp?url=" + url;
        z.textContent = "Open in Zerion";
        box.appendChild(z);
      }
    }
    if (fam === "bitcoin") {
      if (metamaskBtc()) addBtn(box, "MetaMask Bitcoin", function () {
        var api = metamaskBtc();
        Promise.resolve(api.requestAccounts ? api.requestAccounts() : api.connect()).catch(function (err) { console.warn(err); });
      });
      if (zerionBtc()) addBtn(box, "Zerion Bitcoin", function () {
        var api = zerionBtc();
        Promise.resolve(api.requestAccounts ? api.requestAccounts() : api.connect()).catch(function (err) { console.warn(err); });
      });
      var a = document.createElement("a");
      a.className = "btn";
      a.href = "https://metamask.app.link/dapp/" + host;
      a.textContent = "Open in MetaMask";
      if (![].some.call(box.querySelectorAll("a"), function (el) { return el.textContent === a.textContent; })) box.appendChild(a);
      var z = document.createElement("a");
      z.className = "btn";
      z.href = "https://link.zerion.io/dapp?url=" + url;
      z.textContent = "Open in Zerion";
      if (![].some.call(box.querySelectorAll("a"), function (el) { return el.textContent === z.textContent; })) box.appendChild(z);
    }
  }
  var tries = 0;
  function boot() {
    tries += 1;
    if (!reorder() && tries < 40) return setTimeout(boot, 80);
    var hint = document.getElementById("rail-hint");
    if (hint) {
      var orig = hint.textContent;
      if (/Phantom, Solflare/.test(orig) || /UniSat/.test(orig)) {
        /* rewritten below on change */
      }
    }
    var sel = railSel();
    if (sel) sel.addEventListener("change", function () {
      var hintEl = document.getElementById("rail-hint");
      var fam = familyOf(sel.value);
      if (!hintEl) return;
      if (fam === "bitcoin") hintEl.textContent = "Connect MetaMask, Zerion, UniSat, Xverse, Leather, OKX, or Phantom. Confirm the Bitcoin send here.";
      if (fam === "solana") hintEl.textContent = "Connect MetaMask, Zerion, Phantom, Solflare, or Backpack. Confirm the Solana send here.";
    });
    var modal = document.getElementById("modal");
    if (modal) {
      var obs = new MutationObserver(enhanceModal);
      obs.observe(modal, { childList: true, subtree: true, attributes: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
