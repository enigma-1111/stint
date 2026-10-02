(function () {
  const $ = (id) => document.getElementById(id);
  function clean(value) {
    return String(value || "").replace(/[^\w .+\-']/g, "").trim().slice(0, 32);
  }
  function currentBy() {
    return clean($("by") && $("by").value) || "anon";
  }
  function paintBy() {
    const who = document.querySelector(".who");
    const held = window.stintToken && window.stintToken.held;
    if (who) who.textContent = "posted as Human \u00b7 " + currentBy() + (held ? " \u00b7 holds $STINT" : "");
  }
  function clearBy() {
    const el = $("by");
    if (!el) return;
    el.value = "";
    el.setAttribute("autocomplete", "off");
    try { localStorage.removeItem("stint.by"); } catch {}
    paintBy();
  }
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    try {
      const href = typeof url === "string" ? url : (url && url.url) || "";
      if (opts && String(opts.method || "GET").toUpperCase() === "POST" && /\/api\/contribute/.test(href)) {
        const body = JSON.parse(opts.body || "{}");
        if (!clean(body.by || body.name)) body.by = currentBy();
        else body.by = clean(body.by || body.name);
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
      }
    } catch {}
    return nativeFetch(url, opts);
  };
  window.stintName = { clean, currentBy, paintBy, clearBy };
  function boot() {
    clearBy();
    if ($("by")) $("by").addEventListener("input", paintBy);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("pageshow", clearBy);
})();
