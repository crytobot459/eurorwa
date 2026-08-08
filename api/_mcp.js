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
    outputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        signals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ticker: { type: "string" },
              action: { type: "string", enum: ["BUY", "HOLD", "SELL"] },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
            },
          },
        },
        hit_rate: { type: ["object", "null"] },
        verified: { type: ["boolean", "object"] },
      },
    },
  },
  funds: {
    description:
      "Latest snapshot of tracked tokenized money-market funds: TVL, 7d change, yield, holders and on-chain verification status, sorted by TVL.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        funds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ticker: { type: "string" },
              name: { type: "string" },
              yield: { type: "number" },
              tvl: { type: "number" },
              chg_7d_pct: { type: "number" },
              onchain: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
  analytics: {
    description:
      "Institutional analytics across the tokenized money-market sector: total TVL, concentration (top3/5/10, HHI), yield breadth and spread, currency / chain / issuer splits, holders and flows.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        total_tvl: { type: "number" },
        fund_count: { type: "number" },
        concentration: { type: "object" },
        breadth: { type: "object" },
      },
    },
  },
  alerts: {
    description:
      "Latest operational alerts from the EuroRWA monitor: yield breakouts, yield cohort changes, TVL spikes, holder surges and macro regime flips, with severity.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        updated_at: { type: ["string", "null"] },
        alerts: {
          type: "array",
          items: { type: "object", properties: { type: { type: "string" }, severity: { type: "string" } } },
        },
      },
    },
  },
  verify: {
    description:
      "On-chain verification of fund supply: for each tracked fund, the reported supply is cross-checked against on-chain totalSupply() across EVM deployments (USYC, BUIDL, eurSAFO…). Returns per-fund coverage, status (ok / warn / fail / na), RPC-node consensus and supply reconciliation.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        summary: { type: "object" },
        consensus: { type: "object" },
        funds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ticker: { type: "string" },
              status: { type: "string", enum: ["ok", "warn", "fail", "na"] },
              coverage: { type: "number" },
            },
          },
        },
      },
    },
  },
  rotation: {
    description:
      "EUR vs USD yield rotation signal: hedged EUR yield (fund yield + SOFR − ESTR) vs best USD yield, with a ROTATE_EUR / ROTATE_USD / HOLD signal and gap in points.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        signal: { type: "string", enum: ["ROTATE_EUR", "ROTATE_USD", "HOLD", "N/A"] },
        gap_pt: { type: ["number", "null"] },
        best_eur: { type: ["object", "null"] },
        best_usd: { type: ["object", "null"] },
        note: { type: "string" },
      },
    },
  },
  strategy: {
    description:
      "Strategy signals for the RWA-perp ecosystem: collateral ranking (yield, TVL, holders, on-chain coverage), delta-neutral carry per fund vs benchmark, and currency-pair spreads (e.g. eurSAFO vs SAFO).",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        signal: { type: "string" },
        top: { type: ["string", "null"] },
        ranking: { type: "array", items: { type: "string" } },
        note: { type: "string" },
      },
    },
  },
  portfolio: {
    description:
      "Wallet portfolio analysis: given a wallet address, reads balances on-chain across all tracked fund tokens, computes net yield and returns a ROTATE / HOLD / EMPTY signal. Requires a wallet argument.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string", description: "EVM wallet address (0x…)" } },
      required: ["wallet"],
    },
    outputSchema: {
      type: "object",
      properties: {
        wallet: { type: "string" },
        date: { type: ["string", "null"] },
        signal: { type: "string", enum: ["ROTATE", "HOLD", "EMPTY", "N/A"] },
        total: { type: "number" },
        net_yield_pct: { type: "number" },
        note: { type: "string" },
      },
    },
  },
}

const PROMPTS = [
  {
    name: "analyze-wallet",
    description: "Analyze a wallet's exposure to tokenized money-market funds and decide whether to rotate.",
    arguments: [{ name: "wallet", description: "EVM wallet address (0x…)", required: true }],
  },
  {
    name: "verify-funds",
    description: "Cross-check reported fund supply against on-chain supply and interpret the reconciliation.",
  },
  {
    name: "rotate-usd-eur",
    description: "Decide whether to rotate between EUR and USD money-market funds based on hedged yields.",
  },
]

function promptBody(name, args) {
  const w = args?.wallet ?? "<wallet>"
  if (name === "analyze-wallet")
    return `Analyze this wallet's tokenized money-market exposure:
1. Call the "portfolio" tool with wallet=${w} to get on-chain balances, net yield and a ROTATE/HOLD/EMPTY signal.
2. If the signal is ROTATE, call "rotation" for the EUR/USD gap and "strategy" for the best collateral.
3. Reply with total value, net yield, the signal, and the specific action to take.`
  if (name === "verify-funds")
    return `Interpret on-chain supply verification:
1. Call the "verify" tool.
2. For each fund, read status (ok/warn/fail/na), coverage % and the RPC-node consensus.
3. consensus=mismatch means RPC nodes disagree — treat that fund's on-chain data as unreliable.
4. Summarize which funds fully reconcile with reported supply, which diverge, and the ok/warn/fail/na counts.`
  if (name === "rotate-usd-eur")
    return `Decide EUR vs USD rotation:
1. Call the "rotation" tool. Compare best hedged EUR yield vs best USD yield and gap_pt.
2. ROTATE_EUR means move to EUR funds, ROTATE_USD means move to USD, HOLD means keep.
3. State the gap in points and the recommended action with the specific fund tickers.`
  return ""
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

function friendly(name, e) {
  const m = String(e?.message ?? e)
  if (name === "portfolio")
    return `portfolio failed: ${m} — pass a wallet argument, e.g. {"wallet":"0x0000…"}. Balances are read on-chain across all tracked fund tokens.`
  return `${name} failed: ${m}. This is usually because the daily pipeline has not produced data yet — check back after the next scheduled run, or run it locally with: bun run fetch`
}

async function callTool(name, args) {
  const q = new URLSearchParams()
  if (args?.wallet) q.set("wallet", args.wallet)
  if (args?.summary !== false) q.set("summary", "true")
  const qs = q.toString()
  const text = await getApi(`/${API_PATH[name] ?? name}${qs ? "?" + qs : ""}`)
  const j = JSON.parse(text)
  if (j && typeof j === "object" && j.date === null) {
    if (name === "portfolio")
      return `Wallet ${j.wallet ?? args?.wallet} has no portfolio data — either the wallet holds no tracked fund tokens or the portfolio analysis has not run for it.`
    return `No data yet for ${name} — the daily pipeline has not produced it. Check back after the next scheduled run, or run it locally with: bun run fetch`
  }
  return text
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
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "Tokenized money-market fund analysis (RWA). Tools return the latest report, fund snapshot, institutional analytics, alerts, on-chain supply verification, EUR/USD rotation signal, RWA-perp strategy signals and wallet portfolio analysis. Data is fetched on-chain and signed/attested for independent verification. Tools default to compact summary output — pass summary:false in arguments to get the full JSON. Use the prompts (analyze-wallet, verify-funds, rotate-usd-eur) for guided workflows.",
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
        return ok(id, { content: [{ type: "text", text: friendly(name, e) }], isError: true })
      }
    }
    case "prompts/list":
      return ok(id, { prompts: PROMPTS })
    case "prompts/get": {
      const name = params?.name
      const prompt = PROMPTS.find((p) => p.name === name)
      if (!prompt) return err(id, -32602, `Unknown prompt: ${name}`)
      return ok(id, {
        description: prompt.description,
        messages: [{ role: "user", content: { type: "text", text: promptBody(name, params?.arguments) } }],
      })
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
