import { app } from "./_app.js"

const SERVER_INFO = { name: "eurorwa-analyst", version: "1.0.0" }
const KNOWN_PROTOCOLS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"])
const DEFAULT_PROTOCOL = "2025-03-26"

const TOOLS = {
  overview: {
    description:
      "EuroRWA analyst overview — the latest tokenized money-market fund report: BUY/HOLD/SELL signal per fund with reasons, market view, crypto brief and on-chain brief. The report is hashed, signed and attested on-chain (Sepolia) so it can be independently verified.",
    inputSchema: { type: "object", properties: {} },
  },
  funds: {
    description:
      "Latest snapshot of tracked tokenized money-market funds: TVL, 7d change, yield, holders and integrity checks, sorted by TVL.",
    inputSchema: { type: "object", properties: {} },
  },
  analytics: {
    description:
      "Institutional analytics across the tokenized money-market sector: total TVL, concentration (top3/5/10, HHI), yield breadth and spread, currency / chain / issuer splits, holders and flows.",
    inputSchema: { type: "object", properties: {} },
  },
  alerts: {
    description:
      "Latest operational alerts from the EuroRWA monitor: yield breakouts, yield cohort changes, TVL spikes, holder surges and macro regime flips, with severity.",
    inputSchema: { type: "object", properties: {} },
  },
}

const RESOURCES = [
  {
    uri: "eurorwa://analyst/latest",
    name: "Latest analyst report",
    description: "The most recent EuroRWA analyst report (signals + market/crypto/on-chain briefs)",
    mimeType: "application/json",
  },
  {
    uri: "eurorwa://funds/latest",
    name: "Latest fund snapshot",
    description: "The most recent snapshot of tracked money-market funds",
    mimeType: "application/json",
  },
]

async function getApi(path) {
  const res = await app.fetch(new Request(`http://internal${path}`, { method: "GET" }))
  if (!res.ok) throw new Error(`internal api ${res.status}`)
  return JSON.stringify(await res.json(), null, 2)
}

async function callTool(name) {
  return getApi(`/${name}`)
}

async function readResource(uri) {
  if (uri === "eurorwa://analyst/latest") return getApi("/overview")
  if (uri === "eurorwa://funds/latest") return getApi("/funds")
  throw new Error(`unknown resource ${uri}`)
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result })
const err = (id, code, message, data) => ({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } })

async function handle(msg) {
  const { id, method, params } = msg
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: KNOWN_PROTOCOLS.has(params?.protocolVersion) ? params.protocolVersion : DEFAULT_PROTOCOL,
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "Tokenized money-market fund analysis (RWA). Tools return the latest report, fund snapshot, institutional analytics and alerts. Data is fetched on-chain and signed/attested for independent verification.",
      })
    case "ping":
      return ok(id, {})
    case "tools/list":
      return ok(id, { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, ...t })) })
    case "tools/call": {
      const name = params?.name
      const tool = TOOLS[name]
      if (!tool) return err(id, -32602, `Unknown tool: ${name}`)
      try {
        return ok(id, { content: [{ type: "text", text: await callTool(name) }] })
      } catch (e) {
        return ok(id, { content: [{ type: "text", text: String(e?.message ?? e) }], isError: true })
      }
    }
    case "resources/list":
      return ok(id, { resources: RESOURCES })
    case "resources/read": {
      const uri = params?.uri
      if (!RESOURCES.some((r) => r.uri === uri)) return err(id, -32602, `Unknown resource: ${uri}`)
      try {
        return ok(id, { contents: [{ uri, mimeType: "application/json", text: await readResource(uri) }] })
      } catch (e) {
        return err(id, -32603, String(e?.message ?? e))
      }
    }
    default:
      if (method.startsWith("notifications/")) return null
      return err(id, -32601, `Method not found: ${method}`)
  }
}

export async function handleMcp(req) {
  const cors = {
    "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Authorization",
    "Access-Control-Max-Age": "86400",
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    })
  }
  const amSecret = process.env.AGENTICMARKET_SECRET
  if (amSecret && req.headers.get("x-agenticmarket-secret") !== amSecret) {
    return new Response(JSON.stringify(err(null, -32600, "Unauthorized")), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify(err(null, -32700, "Parse error")), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
  const msgs = Array.isArray(body) ? body : [body]
  const results = []
  for (const m of msgs) {
    if (!m || typeof m !== "object" || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
      results.push(err(m?.id ?? null, -32600, "Invalid Request"))
      continue
    }
    const r = await handle(m)
    if (r !== null) results.push(r)
  }
  if (!results.length) return new Response(null, { status: 202, headers: cors })
  const single = !Array.isArray(body) && results.length === 1
  return new Response(JSON.stringify(single ? results[0] : results), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
