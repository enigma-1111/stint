(function () {
  const $ = (id) => document.getElementById(id);
  function clean(value) {
    return String(value || "")
      .replace(/[^\w .+\-']/g, "")
      .trim()
      .slice(0, 32);
  }
  function currentBy() {
    return clean($("by") && $("by").value) || "anon";
  }
  function paintBy() {
    const who = document.querySelector(".who");
    if (who) who.textContent = "posted as Human \u00b7 " + currentBy();
    try {
      localStorage.setItem("stint.by", clean($("by") && $("by").value));
    } catch {}
  }
  function restoreBy() {
    const el = $("by");
    if (!el) return;
    try {
      const saved = clean(localStorage.getItem("stint.by"));
      if (saved && saved !== "anon") el.value = saved;
    } catch {}
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      restoreBy();
      if ($("by")) $("by").addEventListener("input", paintBy);
    });
  } else {
    restoreBy();
    if ($("by")) $("by").addEventListener("input", paintBy);
  }
})();
