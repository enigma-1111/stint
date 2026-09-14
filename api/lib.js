const PAYOUT = "0xB203FAA6207Ce9384D46fa5B9f397D304F17943C".toLowerCase();
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168".toLowerCase();
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RPCS = [
  "https://robinhood-rpc.publicnode.com",
  "https://rpc.mainnet.chain.robinhood.com",
];
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
if (!g.__stintRpc) g.__stintRpc = 0;

function extras() {
  return g.__stintExtra;
}

async function rpc(method, params) {
  let last = new Error("rpc");
  for (let i = 0; i < RPCS.length; i++) {
    const url = RPCS[(g.__stintRpc + i) % RPCS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "rpc");
      g.__stintRpc = (g.__stintRpc + i) % RPCS.length;
      return json.result;
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

function addrFromTopic(topic) {
  return ("0x" + String(topic || "").slice(-40)).toLowerCase();
}

function neededAmount(chars, decimals) {
  return BigInt(chars) * 10n ** BigInt(decimals) / 100n;
}

async function usdgDecimals() {
  const raw = await rpc("eth_call", [{ to: USDG, data: "0x313ce567" }, "latest"]);
  const n = parseInt(raw, 16);
  return n >= 0 && n <= 36 ? n : 6;
}

async function verifyPay(hash, chars) {
  if (!hash || !hash.startsWith("0x") || hash.length < 66) return null;
  let rec = await rpc("eth_getTransactionReceipt", [hash]);
  if (!rec) {
    await new Promise((r) => setTimeout(r, 1200));
    rec = await rpc("eth_getTransactionReceipt", [hash]);
  }
  if (!rec || rec.status !== "0x1") return null;
  const dec = await usdgDecimals();
  const need = neededAmount(chars, dec);
  const logs = rec.logs || [];
  for (const log of logs) {
    if (String(log.address || "").toLowerCase() !== USDG) continue;
    if (!log.topics || String(log.topics[0]).toLowerCase() !== TRANSFER) continue;
    const to = addrFromTopic(log.topics[2]);
    if (to !== PAYOUT) continue;
    const amt = BigInt(log.data || "0x0");
    if (amt >= need) {
      return {
        from: addrFromTopic(log.topics[1]),
        amount: amt.toString(),
        block: parseInt(rec.blockNumber || "0x0", 16) || 0,
      };
    }
  }
  return null;
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
      message: "stint: fold " + row.hash.slice(0, 10),
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

function mergeBook(fileBook, fileChapters, remote, live) {
  const seen = new Set();
  const paragraphs = [];
  const opening = (fileBook && fileBook.paragraphs && fileBook.paragraphs.length)
    ? fileBook.paragraphs
    : OPENING.paragraphs;
  opening.forEach((t) => {
    const text = String(t || "");
    if (!text || seen.has("t:" + text)) return;
    seen.add("t:" + text);
    paragraphs.push({ text, pending: false });
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
    paragraphs.push({
      text: row.text,
      pending: false,
      hash: row.hash || "",
    });
  });
  return {
    title: (fileBook && fileBook.title) || OPENING.title,
    count: paragraphs.length,
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
  OPENING,
  extras,
  verifyPay,
  remoteChapters,
  persistChapter,
  mergeBook,
  cors,
};
