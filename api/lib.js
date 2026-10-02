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

function ghHeaders() {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "stint",
    "cache-control": "no-cache",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (token) headers.authorization = "Bearer " + token;
  return headers;
}

function parseChapters(data) {
  if (!data) return [];
  if (Array.isArray(data.chapters)) return data.chapters;
  if (data.content) {
    try {
      const parsed = JSON.parse(Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf8"));
      return Array.isArray(parsed.chapters) ? parsed.chapters : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function remoteChapters() {
  try {
    const res = await fetch(GH_API + "?ref=main&t=" + Date.now(), {
      cache: "no-store",
      headers: ghHeaders(),
    });
    if (res.ok) {
      const chapters = parseChapters(await res.json());
      if (chapters.length) return chapters;
    }
  } catch {
    /* raw fallback */
  }
  try {
    const res = await fetch(GH_RAW + "?t=" + Date.now(), {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "stint", "cache-control": "no-cache" },
    });
    if (!res.ok) return [];
    return parseChapters(await res.json());
  } catch {
    return [];
  }
}

async function persistChapter(row) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!token) return false;
  try {
    const get = await fetch(GH_API + "?ref=main", {
      headers: ghHeaders(),
    });
    const file = await get.json();
    let chapters = parseChapters(file);
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
      headers: Object.assign(ghHeaders(), { "content-type": "application/json" }),
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

function normalizeBy(value) {
  const s = String(value || "")
    .replace(/[^\w .+\-']/g, "")
    .trim()
    .slice(0, 32);
  return s || "anon";
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
  const remoteList = Array.isArray(remote) ? remote : [];
  const fileList = Array.isArray(fileChapters) ? fileChapters : [];
  const liveList = Array.isArray(live) ? live : [];
  const base = remoteList.length >= fileList.length ? remoteList : fileList;
  const rest = remoteList.length >= fileList.length ? fileList : remoteList;
  const paid = [].concat(base, rest, liveList).filter((row) => row && row.text);
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
      by: normalizeBy(row.by),
      rail: row.rail || "",
      asset: row.asset || "",
      held: Boolean(row.held),
      at: row.at || "",
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
