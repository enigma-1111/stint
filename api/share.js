const fs = require("fs");
const path = require("path");
const { extras, remoteChapters, mergeBook, OPENING } = require("./lib");

const LIVE = "https://stint-tau.vercel.app";
const IMAGE = LIVE + "/og.png";
const SITE_TITLE = "Stint \u2014 the penny story";
const SITE_DESC = "A story anyone can continue. One penny a character. Pay on twenty EVM chains, Bitcoin, or Solana.";
const IMAGE_ALT = "Stint \u2014 a story anyone can continue";

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

function cardMeta(title, desc, canonical, type) {
  return "" +
    "<meta charset=\"utf-8\"/>" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>" +
    "<title>" + esc(title) + "</title>" +
    "<meta name=\"description\" content=\"" + esc(desc) + "\"/>" +
    "<link rel=\"canonical\" href=\"" + esc(canonical) + "\"/>" +
    "<meta property=\"og:locale\" content=\"en_US\"/>" +
    "<meta property=\"og:site_name\" content=\"Stint\"/>" +
    "<meta property=\"og:type\" content=\"" + esc(type) + "\"/>" +
    "<meta property=\"og:title\" content=\"" + esc(title) + "\"/>" +
    "<meta property=\"og:description\" content=\"" + esc(desc) + "\"/>" +
    "<meta property=\"og:url\" content=\"" + esc(canonical) + "\"/>" +
    "<meta property=\"og:image\" content=\"" + IMAGE + "\"/>" +
    "<meta property=\"og:image:secure_url\" content=\"" + IMAGE + "\"/>" +
    "<meta property=\"og:image:type\" content=\"image/png\"/>" +
    "<meta property=\"og:image:width\" content=\"1200\"/>" +
    "<meta property=\"og:image:height\" content=\"630\"/>" +
    "<meta property=\"og:image:alt\" content=\"" + IMAGE_ALT + "\"/>" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\"/>" +
    "<meta name=\"twitter:site\" content=\"@nft_Art\"/>" +
    "<meta name=\"twitter:creator\" content=\"@nft_Art\"/>" +
    "<meta name=\"twitter:title\" content=\"" + esc(clip(title, 70)) + "\"/>" +
    "<meta name=\"twitter:description\" content=\"" + esc(clip(desc, 200)) + "\"/>" +
    "<meta name=\"twitter:image\" content=\"" + IMAGE + "\"/>" +
    "<meta name=\"twitter:image:alt\" content=\"" + IMAGE_ALT + "\"/>";
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
  let canonical = LIVE + "/s";
  let kind = "";
  let target = LIVE + "/";
  let type = "website";

  if (storyOnly) {
    type = "article";
    title = "Stint \u2014 the story so far";
    desc = clip((rows[0] && rows[0].text) || SITE_DESC, 160);
    canonical = LIVE + "/s?story=1";
    target = LIVE + "/?view=story";
  } else if (hash || Number.isFinite(n)) {
    let row = null;
    if (hash) row = rows.find((p) => p.hash && p.hash === hash);
    if (!row && Number.isFinite(n) && n >= 0 && n < rows.length) row = rows[n];
    if (row) {
      type = "article";
      kind = label(row.kind);
      title = "Stint \u2014 " + kind + " passage";
      desc = clip(row.text, 180);
      const key = row.hash ? ("h=" + encodeURIComponent(row.hash)) : ("n=" + rows.indexOf(row));
      canonical = LIVE + "/s?" + key;
      target = LIVE + "/?" + key;
    }
  }

  const html = "<!DOCTYPE html><html lang=\"en\"><head>" +
    cardMeta(title, desc, canonical, type) +
    "<meta http-equiv=\"refresh\" content=\"0;url=" + esc(target) + "\"/>" +
    "</head><body style=\"background:#0d0c0a;color:#f3ece0;font:18px/1.5 Georgia,serif;padding:2rem\">" +
    "<p>STINT</p><h1>" + esc(title) + "</h1><p>" + esc(desc) + "</p>" +
    "<p><a href=\"" + esc(target) + "\" style=\"color:#e4b86a\">Open on Stint</a></p>" +
    "</body></html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  res.status(200).send(html);
};
