(function () {
  const q = new URLSearchParams(location.search);
  const shared = q.has("n") || q.has("h") || q.has("hash") || q.get("view") === "story";
  if (!shared) return;
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    const url = new URL(location.href);
    ["n", "h", "hash", "view"].forEach(function (key) { url.searchParams.delete(key); });
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function () {
    const out = orig.apply(this, arguments);
    finish();
    return out;
  };
  window.addEventListener("scroll", finish, { passive: true, once: true });
  document.addEventListener("pointerdown", finish, { once: true });
  document.addEventListener("keydown", finish, { once: true });
})();
