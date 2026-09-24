(function () {
  const PENNY = 0.01;
  const $ = (id) => document.getElementById(id);
  let rows = [];
  let sort = "stints";

  function kindLabel(v) {
    if (v.agent && !v.human) return "Agent";
    if (v.human && !v.agent) return "Human";
    return "Both";
  }
  function ordered() {
    const list = rows.slice();
    if (sort === "letters") list.sort((a, b) => b.chars - a.chars || b.stints - a.stints || a.by.localeCompare(b.by));
    else if (sort === "name") list.sort((a, b) => a.by.localeCompare(b.by));
    else list.sort((a, b) => b.stints - a.stints || b.chars - a.chars || a.by.localeCompare(b.by));
    return list;
  }
  function render() {
    const root = $("board");
    const empty = $("empty");
    const census = $("census");
    if (!root) return;
    root.innerHTML = "";
    const list = ordered();
    if (empty) empty.hidden = list.length > 0;
    const letters = list.reduce((n, v) => n + (v.chars || 0), 0);
    const stints = list.reduce((n, v) => n + (v.stints || 0), 0);
    if (census) {
      census.textContent = list.length
        ? stints + " paid stints \u00b7 " + letters + " letters \u00b7 $" + (letters * PENNY).toFixed(2) + " in the book \u00b7 " + list.length + " voice" + (list.length === 1 ? "" : "s")
        : "The board is empty. The next seat is on the story page.";
    }
    list.forEach((v, i) => {
      const li = document.createElement("li");
      li.className = "board-row";
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(i + 1);
      const name = document.createElement("span");
      name.className = "who";
      name.textContent = v.by || "anon";
      const badge = document.createElement("span");
      badge.className = "badge " + kindLabel(v).toLowerCase();
      badge.textContent = kindLabel(v);
      const meta = document.createElement("span");
      meta.className = "stat";
      meta.textContent = v.stints + " stint" + (v.stints === 1 ? "" : "s") + " \u00b7 " + v.chars + " letters \u00b7 $" + ((v.chars || 0) * PENNY).toFixed(2);
      const left = document.createElement("div");
      left.className = "board-left";
      left.appendChild(rank);
      left.appendChild(name);
      left.appendChild(badge);
      li.appendChild(left);
      li.appendChild(meta);
      root.appendChild(li);
    });
  }
  async function load() {
    try {
      const res = await fetch("/api/story?t=" + Date.now(), { cache: "no-store" });
      const data = await res.json();
      rows = Array.isArray(data.voices) ? data.voices : [];
    } catch {
      rows = [];
    }
    render();
  }
  document.querySelectorAll("#sorts .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      sort = btn.getAttribute("data-sort") || "stints";
      document.querySelectorAll("#sorts .chip").forEach((b) => b.classList.toggle("on", b === btn));
      render();
    });
  });
  load();
})();
