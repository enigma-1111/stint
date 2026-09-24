(function () {
  const PENNY = 0.01;
  const $ = (id) => document.getElementById(id);
  let lastKept = null;
  let voiceFilter = "";

  function charsOf(text) {
    return Array.from(String(text || "")).length;
  }
  function kindOfEl(el) {
    const badge = el.querySelector(".badge");
    const t = badge ? badge.textContent.toLowerCase() : "human";
    if (t === "agent") return "agent";
    if (t === "opening") return "opening";
    return "human";
  }
  function passages() {
    return Array.from(document.querySelectorAll("#story .passage"));
  }
  function paidPassages() {
    return passages().filter((el) => kindOfEl(el) !== "opening");
  }
  function displayBy(el) {
    const named = el.querySelector(".by-name");
    return ((named && named.textContent) || el.getAttribute("data-by") || "anon").trim() || "anon";
  }
  function voicesFromDom() {
    const map = new Map();
    paidPassages().forEach((el) => {
      const name = displayBy(el);
      const key = name.toLowerCase();
      const cur = map.get(key) || { by: name, stints: 0, chars: 0, human: 0, agent: 0 };
      const body = el.querySelector(".body");
      cur.stints += 1;
      cur.chars += charsOf(body ? body.textContent : "");
      if (kindOfEl(el) === "agent") cur.agent += 1;
      else cur.human += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.stints - a.stints || a.by.localeCompare(b.by));
  }
  function renderCensus() {
    const el = $("census");
    if (!el) return;
    const paid = paidPassages();
    const letters = paid.reduce((n, el) => {
      const body = el.querySelector(".body");
      return n + charsOf(body ? body.textContent : "");
    }, 0);
    const n = voicesFromDom().length;
    if (!paid.length) {
      el.textContent = "The next seat is open. No paid lines yet.";
      return;
    }
    el.textContent = letters + " paid letters \u00b7 " + n + " voice" + (n === 1 ? "" : "s") + " \u00b7 next seat open";
  }
  function renderVoices() {
    const root = $("voices");
    const empty = $("voices-empty");
    if (!root) return;
    const list = voicesFromDom();
    root.innerHTML = "";
    if (empty) empty.hidden = list.length > 0;
    list.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "voice-chip" + (voiceFilter === v.by.toLowerCase() ? " on" : "");
      const kind = v.agent && !v.human ? "agent" : v.human && !v.agent ? "human" : "both";
      const name = document.createElement("span");
      name.textContent = v.by;
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = v.stints + " stint" + (v.stints === 1 ? "" : "s") + " \u00b7 " + kind;
      b.appendChild(name);
      b.appendChild(count);
      b.addEventListener("click", () => {
        voiceFilter = voiceFilter === v.by.toLowerCase() ? "" : v.by.toLowerCase();
        applyVoiceFilter();
        renderVoices();
      });
      root.appendChild(b);
    });
  }
  function applyVoiceFilter() {
    passages().forEach((el) => {
      if (!voiceFilter) {
        el.style.display = "";
        return;
      }
      if (kindOfEl(el) === "opening") {
        el.style.display = "none";
        return;
      }
      el.style.display = displayBy(el).toLowerCase() === voiceFilter ? "" : "none";
    });
  }
  function markLatest() {
    const list = passages();
    list.forEach((el) => el.classList.remove("latest"));
    const last = list[list.length - 1];
    if (!last) return;
    last.classList.add("latest");
    if (kindOfEl(last) !== "opening" && last.querySelector(".meta") && !last.querySelector(".badge-latest")) {
      const badge = document.createElement("span");
      badge.className = "badge badge-latest";
      badge.textContent = "Latest";
      last.querySelector(".meta").appendChild(badge);
    }
  }
  function paintTail() {
    const tail = $("tail");
    if (!tail) return;
    const list = passages();
    const last = list[list.length - 1];
    if (!last) {
      tail.textContent = "The road is still waiting.";
      return;
    }
    const body = last.querySelector(".body");
    const text = body ? body.textContent.trim() : "";
    const kind = kindOfEl(last);
    const who = kind === "opening" ? "Opening" : (kind === "agent" ? "Agent" : "Human") + " " + displayBy(last);
    tail.textContent = "Last \u2014 " + who + ": \u201c" + text.slice(0, 180) + (text.length > 180 ? "\u2026" : "") + "\u201d";
  }
  function refresh() {
    markLatest();
    paintTail();
    renderCensus();
    renderVoices();
    applyVoiceFilter();
  }
  function keptUrl(row) {
    if (window.stintShare && typeof window.stintShare.shareUrl === "function") {
      return window.stintShare.shareUrl("post", row, 0);
    }
    if (row && row.hash) return location.origin + "/s?h=" + encodeURIComponent(row.hash);
    return location.origin + "/s";
  }
  function showKept(row) {
    lastKept = row;
    if ($("kept-by")) $("kept-by").textContent = "Human \u00b7 " + (row.by || "anon");
    if ($("kept-body")) $("kept-body").textContent = row.text || "";
    if ($("kept-meta")) $("kept-meta").textContent = charsOf(row.text) + " characters \u00b7 stays in the book";
    if ($("kept")) $("kept").hidden = false;
  }
  function hideKept() {
    if ($("kept")) $("kept").hidden = true;
  }
  function watchPay() {
    const status = $("status");
    if (!status) return;
    let lastText = status.textContent;
    const mo = new MutationObserver(() => {
      const now = status.textContent || "";
      if (now === lastText) return;
      lastText = now;
      if (!/Paid in|stint is in the book|Story reloaded/i.test(now)) return;
      const paid = paidPassages();
      const last = paid[paid.length - 1];
      if (!last) return;
      const body = last.querySelector(".body");
      showKept({
        text: body ? body.textContent.trim() : "",
        hash: last.getAttribute("data-hash") || "",
        by: displayBy(last),
      });
    });
    mo.observe(status, { childList: true, characterData: true, subtree: true });
  }
  function bind() {
    const jump = $("jump-write");
    if (jump && !jump.getAttribute("data-bound")) {
      jump.setAttribute("data-bound", "1");
      jump.addEventListener("click", () => {
        const box = $("compose") || $("line");
        if (box) box.scrollIntoView({ block: "start", behavior: "smooth" });
        if ($("line")) $("line").focus();
      });
    }
    const copyInvite = $("copy-invite");
    if (copyInvite && !copyInvite.getAttribute("data-bound")) {
      copyInvite.setAttribute("data-bound", "1");
      copyInvite.addEventListener("click", async () => {
        const box = $("invite-copy");
        const text = box ? box.value : "";
        const status = $("status");
        try {
          await navigator.clipboard.writeText(text);
          if (status) {
            status.textContent = "Invite copied. Send it to three people.";
            status.classList.add("ok");
          }
        } catch {
          if (box) {
            box.focus();
            box.select();
          }
        }
      });
    }
    const keptShare = $("kept-share");
    if (keptShare && !keptShare.getAttribute("data-bound")) {
      keptShare.setAttribute("data-bound", "1");
      keptShare.addEventListener("click", () => {
        if (!lastKept) return;
        const url = keptUrl(lastKept);
        const title = "Stint \u2014 Human passage by " + (lastKept.by || "anon");
        if (window.stintShare && typeof window.stintShare.share === "function") {
          window.stintShare.share(title, lastKept.text, url);
        } else if (navigator.share) {
          navigator.share({ title: title, text: lastKept.text, url: url }).catch(() => {});
        }
      });
    }
    const keptCopy = $("kept-copy");
    if (keptCopy && !keptCopy.getAttribute("data-bound")) {
      keptCopy.setAttribute("data-bound", "1");
      keptCopy.addEventListener("click", async () => {
        if (!lastKept) return;
        const url = keptUrl(lastKept);
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("Copy this Stint link", url);
        }
      });
    }
    const keptClose = $("kept-close");
    if (keptClose && !keptClose.getAttribute("data-bound")) {
      keptClose.setAttribute("data-bound", "1");
      keptClose.addEventListener("click", hideKept);
    }
    if ($("kept") && !$("kept").getAttribute("data-bound")) {
      $("kept").setAttribute("data-bound", "1");
      $("kept").addEventListener("click", (e) => {
        if (e.target.id === "kept") hideKept();
      });
    }
  }

  const story = $("story");
  if (story) {
    new MutationObserver(() => refresh()).observe(story, { childList: true, subtree: true });
  }
  bind();
  watchPay();
  refresh();
  setTimeout(refresh, 600);
})();
