(function () {
  const LIVE = location.origin;
  function passageKey(row, i) {
    return row && row.hash ? "h=" + encodeURIComponent(row.hash) : "n=" + i;
  }
  function shareUrl(kind, row, i) {
    if (kind === "site") return LIVE + "/s";
    if (kind === "story") return LIVE + "/s?story=1";
    return LIVE + "/s?" + passageKey(row, i);
  }
  async function share(title, text, url) {
    try {
      if (navigator.share) {
        await navigator.share({ title: title, text: text, url: url });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      const status = document.getElementById("status");
      if (status) {
        status.textContent = "Link copied.";
        status.classList.add("ok");
      }
    } catch {
      window.prompt("Copy this Stint link", url);
    }
  }
  function btn(label, title, text, url) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "share-btn";
    b.textContent = label;
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      share(title, text, url);
    });
    return b;
  }
  function decorateHeader() {
    const top = document.querySelector(".top");
    if (!top || top.querySelector(".share-row")) return;
    const row = document.createElement("div");
    row.className = "share-row";
    row.appendChild(btn("Share site", "Stint \u2014 the penny story", "A story anyone can continue. One penny a character.", shareUrl("site")));
    row.appendChild(btn("Share story", "Stint \u2014 the story so far", "Read the penny story on Stint.", shareUrl("story")));
    top.appendChild(row);
  }
  function decoratePassages() {
    const root = document.getElementById("story");
    if (!root) return;
    const passages = root.querySelectorAll(".passage");
    passages.forEach(function (el, i) {
      if (el.querySelector(".share-btn")) return;
      const meta = el.querySelector(".meta");
      const body = el.querySelector(".body");
      const text = body ? body.textContent : "";
      const badge = el.querySelector(".badge");
      const kind = badge ? badge.textContent : "Human";
      const hash = el.getAttribute("data-hash") || "";
      const row = { hash: hash, text: text, kind: kind.toLowerCase() };
      if (meta) meta.appendChild(btn("Share", "Stint \u2014 " + kind + " passage", text.slice(0, 180), shareUrl("post", row, i)));
    });
  }
  function openDeepLink() {
    const q = new URLSearchParams(location.search);
    const hash = q.get("h") || q.get("hash") || "";
    const n = parseInt(q.get("n") || "", 10);
    const view = q.get("view");
    const root = document.getElementById("story");
    if (!root) return;
    const passages = root.querySelectorAll(".passage");
    let hit = null;
    if (hash) {
      passages.forEach(function (el) {
        if (el.getAttribute("data-hash") === hash) hit = el;
      });
    } else if (Number.isFinite(n) && passages[n]) hit = passages[n];
    if (hit) {
      hit.classList.add("focus");
      hit.scrollIntoView({ block: "center", behavior: "smooth" });
    } else if (view === "story" && root) {
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
  function stampHashes() {
    const root = document.getElementById("story");
    if (!root) return;
    root.querySelectorAll(".passage").forEach(function (el) {
      if (el.getAttribute("data-hash")) return;
      const meta = el.querySelector(".meta");
      /* hash is not in DOM; leave n-based share */
    });
  }
  const mo = new MutationObserver(function () {
    decoratePassages();
    stampHashes();
  });
  if (document.getElementById("story")) mo.observe(document.getElementById("story"), { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      decorateHeader();
      decoratePassages();
      setTimeout(openDeepLink, 400);
    });
  } else {
    decorateHeader();
    decoratePassages();
    setTimeout(openDeepLink, 400);
  }
})();
