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
  res.status(200).json({
    ok: true,
    live: "https://stint-tau.vercel.app",
    updated: book.updated || null,
    ...payload,
  });
};
