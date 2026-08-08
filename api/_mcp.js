import { app } from "./_app.js"
import { requirements, bazaarExtension, payTo, verifyPayment, settlePayment, paymentResponseHeader } from "./_x402.js"

const SERVER_INFO = { name: "eurorwa-analyst", version: "1.0.0" }
const KNOWN_PROTOCOLS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"])
const DEFAULT_PROTOCOL = "2025-03-26"

const TOOLS = {
  overview: {
    description:
      "EuroRWA analyst overview — the latest tokenized money-market fund report: BUY/HOLD/SELL signal per fund with reasons, market view, crypto brief and on-chain brief. The report is hashed, signed and attested on-chain (Sepolia) so it can be independently verified. Paid tool — $0.05 USDC per call (x402, PAYMENT-REQUIRED challenge).",
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
  verify: {
    description:
      "On-chain verification of fund supply: for each tracked fund, the reported supply is cross-checked against on-chain totalSupply() across EVM deployments (USYC, BUIDL, eurSAFO…). Returns per-fund coverage and a status (ok / warn / fail / na) — our trustless data moat.",
    inputSchema: { type: "object", properties: {} },
  },
  rotation: {
    description:
      "EUR vs USD yield rotation signal: hedged EUR yield (fund yield + SOFR − ESTR) vs best USD yield, with a ROTATE_EUR / ROTATE_USD / HOLD signal and gap in points.",
    inputSchema: { type: "object", properties: {} },
  },
  strategy: {
    description:
      "Strategy signals for the RWA-perp ecosystem: collateral ranking (yield, TVL, holders, on-chain coverage), delta-neutral carry per fund vs benchmark, and currency-pair spreads (e.g. eurSAFO vs SAFO).",
    inputSchema: { type: "object", properties: {} },
  },
  portfolio: {
    description:
      "Wallet portfolio analysis: given a wallet address, reads balances on-chain across all tracked fund tokens, computes net yield and returns a ROTATE / HOLD signal. Requires a wallet argument.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string", description: "EVM wallet address (0x…)" } },
      required: ["wallet"],
    },
  },
}

const PAID_TOOLS = new Set(["overview"])
const MCP_ORIGIN = "https://rwa-dashboard-gamma.vercel.app"

const API_PATH = {
  verify: "verification",
  rotation: "rotation",
  strategy: "strategy",
  portfolio: "portfolio",
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

async function callTool(name, args) {
  const path = API_PATH[name] ?? name
  const q = args?.wallet ? `?wallet=${encodeURIComponent(args.wallet)}` : ""
  return getApi(`/${path}${q}`)
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
          "Tokenized money-market fund analysis (RWA). Tools return the latest report, fund snapshot, institutional analytics, alerts, on-chain supply verification, EUR/USD rotation signal, RWA-perp strategy signals and wallet portfolio analysis. Data is fetched on-chain and signed/attested for independent verification.",
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
        return ok(id, { content: [{ type: "text", text: await callTool(name, params?.arguments) }] })
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
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Authorization, PAYMENT-SIGNATURE, X-Payment",
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
  const needsPay = msgs.some((m) => m?.method === "tools/call" && PAID_TOOLS.has(m?.params?.name))
  if (amSecret && !needsPay && req.headers.get("x-agenticmarket-secret") !== amSecret) {
    return new Response(JSON.stringify(err(null, -32600, "Unauthorized")), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
  if (needsPay) {
    const raw = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("X-Payment")
    const v = await verifyPayment(raw)
    if (!v.ok) return mcpPaymentRequired(req, cors, v.reason)
    const settlement = await settlePayment(v.payload, mcpResource(req))
    const results = []
    for (const m of msgs) {
      if (!m || typeof m !== "object" || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
        results.push(err(m?.id ?? null, -32600, "Invalid Request"))
        continue
      }
      const r = await handle(m)
      if (r !== null) results.push(r)
    }
    const single = !Array.isArray(body) && results.length === 1
    return new Response(JSON.stringify(single ? results[0] : results), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json", "PAYMENT-RESPONSE": paymentResponseHeader(settlement) },
    })
  }
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

function mcpResource(req) {
  const origin = new URL(req.url).origin || MCP_ORIGIN
  return {
    url: `${origin}/mcp`,
    description:
      "EuroRWA analyst MCP — paid tool: latest BUY/HOLD/SELL report, hashed + signed + attested on-chain (Sepolia)",
    mimeType: "application/json",
    serviceName: "EuroRWA Analyst MCP",
  }
}

function mcpPaymentRequired(req, cors, error) {
  const pay = payTo()
  if (!pay) {
    return new Response(JSON.stringify(err(null, -32603, "x402 not configured — set X402_PAYTO or X402_KEY")), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
  const body = {
    x402Version: 2,
    error: error ?? "Payment required",
    resource: mcpResource(req),
    accepts: [requirements(pay)],
    extensions: { bazaar: bazaarExtension() },
  }
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64")
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32002,
        message: "Payment required",
        data: { resource: body.resource, accepts: body.accepts },
      },
    }),
    {
      status: 402,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": b64,
        "X-Payment-Required": "true",
        "X-Payment-Network": process.env.X402_NETWORK === "8453" ? "base" : "base-sepolia",
        "X-Payment-Amount": "50000",
        "X-Payment-Currency": "USDC",
        "X-Payment-Address": pay,
      },
    },
  )
}
