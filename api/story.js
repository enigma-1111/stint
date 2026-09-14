const fs = require("fs");
const path = require("path");
const { extras, cors } = require("./lib");
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), name), "utf8")); }
  catch { return fallback; }
}
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  const book = readJson("story.json", { paragraphs: [] });
  const extraFile = readJson("chapters.json", { chapters: [] });
  const live = extras();
  const seen = new Set();
  const paragraphs = [];
  (book.paragraphs || []).forEach((t) => paragraphs.push({ text: t, pending: false }));
  [].concat(extraFile.chapters || [], live).forEach((row) => {
    const key = row.hash || row.text;
    if (seen.has(key)) return;
    seen.add(key);
    paragraphs.push({ text: row.text, pending: false, hash: row.hash || "" });
  });
  res.status(200).json({ title: book.title || "The road that kept going", count: paragraphs.length, paragraphs });
};
