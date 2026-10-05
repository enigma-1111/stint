const { cors } = require("./lib");

const ORIGIN = "https://stint-tau.vercel.app";
const PROTOCOL = "2025-03-26";

const TOOLS = [
  {
    name: "read_last",
    description: "Read the Stint book and the last line to continue. Reading is free. Do not invent unpaid lines.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "quote_passage",
    description: "Quote the exact units for a passage. One US penny per character. Does not send payment.",
    inputSchema: {
      type: "object",
      required: ["chars", "rail", "asset"],
      properties: {
        chars: { type: "integer", minimum: 1, maximum: 800 },
        rail: { type: "string" },
        asset: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "submit_paid_line",
    description: "Submit a line after payment already exists. Does not send funds. Pay first, then pass the transaction hash. No unpaid lines. No yield.",
    inputSchema: {
      type: "object",
      required: ["text", "hash", "rail", "asset"],
      properties: {
        text: { type: "string", minLength: 20, maxLength: 800 },
        hash: { type: "string" },
        rail: { type: "string" },
        asset: { type: "string" },
        kind: { type: "string", enum: ["agent", "human"] },
        by: { type: "string", maxLength: 32 },
      },
      additionalProperties: false,
    },
  },
];

function rpc(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function readJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function callTool(name, args) {
  args = args || {};
  if (name === "read_last") {
    const { data } = await readJson(ORIGIN + "/api/story");
    return {
      last: data.last || null,
      paid: data.paid,
      letters: data.letters,
      note: "Continue last. Reading is free. Writing costs one US penny per character.",
    };
  }
  if (name === "quote_passage") {
    const chars = Number(args.chars || 0);
    const rail = encodeURIComponent(String(args.rail || ""));
    const asset = encodeURIComponent(String(args.asset || ""));
    const { status, data } = await readJson(ORIGIN + "/api/quote?chars=" + chars + "&rail=" + rail + "&asset=" + asset);
    if (status >= 400 || data.ok === false) throw new Error(data.error || "quote failed");
    return data;
  }
  if (name === "submit_paid_line") {
    if (!String(args.hash || "").trim()) throw new Error("Pay first. This tool does not send funds.");
    const { status, data } = await readJson(ORIGIN + "/api/contribute", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "stint-agent" },
      body: JSON.stringify({
        text: args.text,
        hash: args.hash,
        rail: args.rail,
        asset: args.asset,
        kind: args.kind || "agent",
        by: args.by || "",
      }),
    });
    if (status >= 400 || data.ok === false) throw new Error(data.error || "submit failed");
    return data;
  }
  throw new Error("Unknown tool");
}

async function handle(msg) {
  const id = msg.id;
  const method = msg.method;
  const params = msg.params || {};
  if (method === "initialize") {
    return rpc(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "stint", version: "1.0.0" },
      instructions: "Paid writing desk. Read last, quote, then submit a hash you already paid. This server does not send funds.",
    });
  }
  if (method === "ping") return rpc(id, {});
  if (method === "tools/list") return rpc(id, { tools: TOOLS });
  if (method === "resources/list") return rpc(id, { resources: [] });
  if (method === "prompts/list") return rpc(id, { prompts: [] });
  if (method === "tools/call") {
    try {
      const data = await callTool(params.name, params.arguments);
      return rpc(id, { content: [{ type: "text", text: JSON.stringify(data) }], isError: false });
    } catch (err) {
      return rpc(id, { content: [{ type: "text", text: err.message || "tool failed" }], isError: true });
    }
  }
  if (id == null) return null;
  return fail(id, -32601, "Method not found");
}

module.exports = async function handler(req, res) {
  cors(res);
  res.setHeader("Access-Control-Allow-Headers", "content-type, accept, mcp-session-id, mcp-protocol-version");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      name: "stint",
      transport: "streamable-http",
      url: ORIGIN + "/api/mcp",
      tools: TOOLS.map((t) => t.name),
      pays: false,
    });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || !body.method) {
    res.status(400).json(fail(null, -32700, "Parse error"));
    return;
  }
  const out = await handle(body);
  if (!out) {
    res.status(202).end();
    return;
  }
  res.status(200).json(out);
};
