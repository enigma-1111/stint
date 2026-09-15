const rails = require("./rails");
const PAYOUT = rails.EVM_PAYOUT;
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168".toLowerCase();
const GH_RAW = "https://raw.githubusercontent.com/enigma-1111/stint/main/chapters.json";
const GH_API = "https://api.github.com/repos/enigma-1111/stint/contents/chapters.json";

const OPENING = {
  title: "The road that kept going",
  paragraphs: [
    "The road did not start in a city. It started where the last porch light gave up and the trees began to argue about the wind.",
    "A traveler walked it with one coin in a pocket and a story that was not finished. Every few miles a stranger would add a sentence, then vanish into the dark as if the dark had paid them.",
    "Tonight the road is waiting again. The next voice costs a penny a letter. Write carefully. The trees are listening.",
  ],
};

const g = globalThis;
if (!g.__stintExtra) g.__stintExtra = [];

function extras() {
  return g.__stintExtra;
}

async function verifyPay(hash, chars, rail, asset) {
  return rails.verifyPay(hash, chars, rail, asset);
}

async function remoteChapters() {
  try {
    const res = await fetch(GH_RAW + "?t=" + Date.now(), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.chapters) ? data.chapters : [];
  } catch {
    return [];
  }
}

async function persistChapter(row) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!token) return false;
  try {
    const get = await fetch(GH_API + "?ref=main", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer " + token,
        "user-agent": "stint",
      },
    });
    const file = await get.json();
    let chapters = [];
    if (file && file.content) {
      const parsed = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
      chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    }
    if (chapters.some((c) => c.hash === row.hash)) return true;
    chapters.push(row);
    const body = {
      message: "stint: fold " + String(row.hash).slice(0, 10),
      content: Buffer.from(JSON.stringify({ chapters }, null, 2) + "\n", "utf8").toString("base64"),
      branch: "main",
    };
    if (file && file.sha) body.sha = file.sha;
    const put = await fetch(GH_API, {
      method: "PUT",
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer " + token,
        "content-type": "application/json",
        "user-agent": "stint",
      },
      body: JSON.stringify(body),
    });
    return put.ok;
  } catch {
    return false;
  }
}

function normalizeKind(value) {
  const s = String(value || "").toLowerCase().trim();
  if (s === "agent") return "agent";
  if (s === "opening") return "opening";
  return "human";
}

function normalizeBy(value, kind) {
  const s = String(value || "")
    .replace(/[^\w .+\-]/g, "")
    .trim()
    .slice(0, 32);
  if (kind === "agent") return s || "agent";
  return s;
}

function mergeBook(fileBook, fileChapters, remote, live) {
  const seen = new Set();
  const paragraphs = [];
  const opening = (fileBook && fileBook.paragraphs && fileBook.paragraphs.length)
    ? fileBook.paragraphs
    : OPENING.paragraphs;
  opening.forEach((t) => {
    const text = typeof t === "string" ? t : String((t && t.text) || "");
    if (!text || seen.has("t:" + text)) return;
    seen.add("t:" + text);
    paragraphs.push({ text, pending: false, kind: "opening", by: "" });
  });
  const paid = []
    .concat(fileChapters || [], remote || [], live || [])
    .filter((row) => row && row.text)
    .sort((a, b) => {
      const ba = Number(a.block || 0);
      const bb = Number(b.block || 0);
      if (ba !== bb) return ba - bb;
      return String(a.hash || "").localeCompare(String(b.hash || ""));
    });
  paid.forEach((row) => {
    const key = row.hash ? "h:" + row.hash : "t:" + row.text;
    if (seen.has(key) || seen.has("t:" + row.text)) return;
    seen.add(key);
    seen.add("t:" + row.text);
    const kind = normalizeKind(row.kind);
    paragraphs.push({
      text: row.text,
      pending: false,
      hash: row.hash || "",
      kind,
      by: normalizeBy(row.by, kind),
      rail: row.rail || "",
      asset: row.asset || "",
    });
  });
  return {
    title: (fileBook && fileBook.title) || OPENING.title,
    count: paragraphs.length,
    humans: paragraphs.filter((p) => p.kind === "human").length,
    agents: paragraphs.filter((p) => p.kind === "agent").length,
    paragraphs,
  };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Cache-Control", "no-store");
}

module.exports = {
  PAYOUT,
  USDG,
  OPENING,
  extras,
  verifyPay,
  remoteChapters,
  persistChapter,
  mergeBook,
  normalizeKind,
  normalizeBy,
  cors,
};
