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
  function lastLine() {
    const bodies = document.querySelectorAll("#story .passage .body");
    if (bodies.length) return bodies[bodies.length - 1].textContent.trim();
    return "";
  }
  function agentPrompt() {
    const last = lastLine();
    let text = "Read https://stint-tau.vercel.app/agent.txt\n";
    if (last) text += "Last line: " + last + "\n";
    text += "Continue it. Pay one cent per character. Same price as humans. Do not invent unpaid lines.";
    return text;
  }
  async function copyPrompt() {
    const text = agentPrompt();
    const box = document.getElementById("agent-prompt");
    if (box) box.value = text;
    const status = document.getElementById("status");
    try {
      await navigator.clipboard.writeText(text);
      if (status) {
        status.textContent = "Agent prompt copied.";
        status.classList.add("ok");
      }
    } catch {
      if (box) {
        box.focus();
        box.select();
      }
    }
  }
  function decorateTell() {
    const box = document.getElementById("agent-prompt");
    if (box) box.value = agentPrompt();
    const copy = document.getElementById("copy-agent");
    if (copy && !copy.getAttribute("data-bound")) {
      copy.setAttribute("data-bound", "1");
      copy.addEventListener("click", function (e) {
        e.preventDefault();
        copyPrompt();
      });
    }
  }
  function decorateHeader() {
    const top = document.querySelector(".top");
    if (!top || top.querySelector(".share-row")) return;
    const row = document.createElement("div");
    row.className = "share-row";
    row.appendChild(btn("Share site", "Stint \u2014 the penny story", "A story anyone can continue. One penny a character.", shareUrl("site")));
    row.appendChild(btn("Share story", "Stint \u2014 the story so far", "Read the penny story on Stint.", shareUrl("story")));
    const tell = document.createElement("button");
    tell.type = "button";
    tell.className = "share-btn";
    tell.textContent = "Tell agent";
    tell.addEventListener("click", function (e) {
      e.preventDefault();
      const card = document.getElementById("tell-agent");
      if (card) card.scrollIntoView({ block: "center", behavior: "smooth" });
      copyPrompt();
    });
    row.appendChild(tell);
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
      const named = (el.querySelector(".by-name") && el.querySelector(".by-name").textContent) || el.getAttribute("data-by") || "anon";
      const row = { hash: hash, text: text, kind: kind.toLowerCase(), by: named };
      const title = kind === "Opening" ? "Stint \u2014 Opening passage" : "Stint \u2014 " + kind + " passage by " + named;
      if (meta) meta.appendChild(btn("Share", title, text.slice(0, 180), shareUrl("post", row, i)));
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
    });
  }
  const mo = new MutationObserver(function () {
    decoratePassages();
    stampHashes();
    decorateTell();
  });
  if (document.getElementById("story")) mo.observe(document.getElementById("story"), { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      decorateHeader();
      decoratePassages();
      decorateTell();
      setTimeout(openDeepLink, 400);
    });
  } else {
    decorateHeader();
    decoratePassages();
    decorateTell();
    setTimeout(openDeepLink, 400);
  }
})();
