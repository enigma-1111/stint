const fs = require("fs");
const path = require("path");
const { extras, remoteChapters, mergeBook, cors, OPENING } = require("./lib");

function readJson(name, fallback) {
  const tries = [
    path.join(process.cwd(), name),
    path.join(__dirname, "..", name),
    path.join(__dirname, name),
  ];
  for (const p of tries) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      /* next */
    }
  }
  return fallback;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const book = readJson("story.json", OPENING);
  const extraFile = readJson("chapters.json", { chapters: [] });
  const remote = await remoteChapters();
  const payload = mergeBook(book, extraFile.chapters || [], remote, extras());
  const paras = payload.paragraphs || [];
  const lastRow = paras[paras.length - 1] || null;
  const paid = paras.filter((p) => p.kind && p.kind !== "opening");
  const voiceMap = new Map();
  paid.forEach((row) => {
    const name = String(row.by || "anon");
    const key = name.toLowerCase();
    const cur = voiceMap.get(key) || { by: name, stints: 0, chars: 0, human: 0, agent: 0 };
    cur.stints += 1;
    cur.chars += Array.from(String(row.text || "")).length;
    if (row.kind === "agent") cur.agent += 1;
    else cur.human += 1;
    voiceMap.set(key, cur);
  });
  const letters = paid.reduce((n, row) => n + Array.from(String(row.text || "")).length, 0);
  res.status(200).json({
    ok: true,
    live: "https://stint-tau.vercel.app",
    persist: Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
    updated: book.updated || null,
    last: lastRow ? {
      index: paras.length - 1,
      text: lastRow.text,
      kind: lastRow.kind,
      by: lastRow.by || (lastRow.kind === "opening" ? "" : "anon"),
      hash: lastRow.hash || "",
    } : null,
    paid: paid.length,
    letters,
    usd: Number((letters * 0.01).toFixed(2)),
    voices: Array.from(voiceMap.values()).sort((a, b) => b.stints - a.stints || a.by.localeCompare(b.by)),
    ...payload,
  });
};
