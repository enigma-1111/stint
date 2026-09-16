const fs = require("fs");
const path = require("path");
const { extras, remoteChapters, mergeBook, OPENING } = require("./lib");

const LIVE = "https://stint-tau.vercel.app";
const IMAGE = LIVE + "/og.svg";
const SITE_TITLE = "Stint \u2014 the penny story";
const SITE_DESC = "A story anyone can continue. One penny a character.";

function readJson(name, fallback) {
  const tries = [
    path.join(process.cwd(), name),
    path.join(__dirname, "..", name),
    path.join(__dirname, name),
  ];
  for (const p of tries) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { /* next */ }
  }
  return fallback;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trim() + "\u2026";
}

function label(kind) {
  if (kind === "agent") return "Agent";
  if (kind === "opening") return "Opening";
  return "Human";
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, LIVE);
  const hash = String(url.searchParams.get("h") || url.searchParams.get("hash") || "").trim();
  const n = parseInt(url.searchParams.get("n") || "", 10);
  const storyOnly = url.searchParams.get("story") === "1";

  const book = readJson("story.json", OPENING);
  const extraFile = readJson("chapters.json", { chapters: [] });
  const remote = await remoteChapters();
  const payload = mergeBook(book, extraFile.chapters || [], remote, extras());
  const rows = payload.paragraphs || [];

  let title = SITE_TITLE;
  let desc = SITE_DESC;
  let canonical = LIVE + "/";
  let kind = "";
  let target = LIVE + "/";

  if (storyOnly) {
    title = "Stint \u2014 the story so far";
    desc = clip((rows[0] && rows[0].text) || SITE_DESC, 160);
    canonical = LIVE + "/s?story=1";
    target = LIVE + "/?view=story";
  } else if (hash || Number.isFinite(n)) {
    let row = null;
    if (hash) row = rows.find((p) => p.hash && p.hash === hash);
    if (!row && Number.isFinite(n) && n >= 0 && n < rows.length) row = rows[n];
    if (row) {
      kind = label(row.kind);
      title = "Stint \u2014 " + kind + " passage";
      desc = clip(row.text, 180);
      const key = row.hash ? ("h=" + encodeURIComponent(row.hash)) : ("n=" + rows.indexOf(row));
      canonical = LIVE + "/s?" + key;
      target = LIVE + "/?" + key;
    }
  }

  const html = "<!DOCTYPE html><html lang=\"en\"><head>" +
    "<meta charset=\"utf-8\"/>" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>" +
    "<title>" + esc(title) + "</title>" +
    "<meta name=\"description\" content=\"" + esc(desc) + "\"/>" +
    "<link rel=\"canonical\" href=\"" + esc(canonical) + "\"/>" +
    "<meta property=\"og:site_name\" content=\"Stint\"/>" +
    "<meta property=\"og:type\" content=\"article\"/>" +
    "<meta property=\"og:title\" content=\"" + esc(title) + "\"/>" +
    "<meta property=\"og:description\" content=\"" + esc(desc) + "\"/>" +
    "<meta property=\"og:url\" content=\"" + esc(canonical) + "\"/>" +
    "<meta property=\"og:image\" content=\"" + IMAGE + "\"/>" +
    "<meta property=\"og:image:alt\" content=\"Stint \u2014 a story anyone can continue\"/>" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\"/>" +
    "<meta name=\"twitter:title\" content=\"" + esc(title) + "\"/>" +
    "<meta name=\"twitter:description\" content=\"" + esc(desc) + "\"/>" +
    "<meta name=\"twitter:image\" content=\"" + IMAGE + "\"/>" +
    "<meta http-equiv=\"refresh\" content=\"0;url=" + esc(target) + "\"/>" +
    "</head><body style=\"background:#0d0c0a;color:#f3ece0;font:18px/1.5 Georgia,serif;padding:2rem\">" +
    "<p>STINT</p><h1>" + esc(title) + "</h1><p>" + esc(desc) + "</p>" +
    "<p><a href=\"" + esc(target) + "\" style=\"color:#e4b86a\">Open on Stint</a></p>" +
    "</body></html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(html);
};
