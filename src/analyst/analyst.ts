import { jsonChat } from "./llm"
import type { Indicator, YieldRank } from "./data"
import type { NewsSignal } from "./news"
import type { FlowSignal } from "./flow"
import type { MacroSignal } from "./macro"
import type { CryptoSignal } from "./crypto"
import type { ChainSignal } from "./chain"

export interface Signal {
  ticker: string
  action: "BUY" | "HOLD" | "SELL"
  confidence: "low" | "medium" | "high"
  reasons: string[]
}

export interface Report {
  date: string
  generated_at: string
  market_view: string
  crypto_view: string
  chain_view: string
  signals: Signal[]
  news_used: NewsSignal[]
  flow_used: FlowSignal[]
  macro_used: MacroSignal
  crypto_used: CryptoSignal
  chain_used: ChainSignal
}

const SYS = `You are AnalystAgent — an expert in tokenized RWA money-market funds (tokenized treasury funds) AND the broader crypto/blockchain market.
Input: (1) fund table (yield + 30/90d trends, TVL 7/30/90d, holders), (2) news signals, (3) on-chain flows (holders/supply 7d), (4) macro (Fear&Greed, BTC, RWA vs T-bill yield spread), (5) crypto market data (total mcap, BTC/ETH, dominance, top movers), (6) on-chain/blockchain data (DeFi TVL, stablecoins, BTC/ETH network activity).
Your job: (a) for EACH fund give a recommendation BUY (buy/add because yield is high or rising), HOLD (keep), SELL (exit because yield is low, falling, or risky); (b) write crypto_view — a short English crypto market brief for a broad audience, using EXACTLY this 3-part structure on one line each, prefixed by "Regime:", "Rotation:", "What to watch:" — Regime = market phase (risk_on/neutral/risk_off) with Fear&Greed and mcap evidence; Rotation = where capital is moving (BTC vs alts, dominance, top movers, trending); What to watch = 1-2 key levels/events that could flip the regime; (c) write chain_view — a short English on-chain brief using EXACTLY this 3-part structure: "Liquidity:" (DeFi TVL + stablecoin trend), "Activity:" (BTC/ETH network, fees), "Watch:" (notable on-chain signal).
The 3 view fields are SEPARATE outputs with distinct content: market_view = general 2-3 sentence overview; crypto_view = ONLY the Regime/Rotation/What-to-watch brief; chain_view = ONLY the Liquidity/Activity/Watch brief. Do NOT put Regime/Rotation/Liquidity lines into market_view. Each view field stays inside its own key.
BUY criteria: top yield cohort or yield_30d rising strongly + inflows (TVL/holders up) or positive news. SELL: lowest yield cohort + outflows, or yield dropping fast. Otherwise HOLD.
30/90d trends matter a lot: positive yield_chg_30d_pct = yield rising (supports BUY/HOLD); strongly negative = yield falling (supports SELL). If yield rises fast but holders withdraw (profit-taking) → consider HOLD instead of rushing SELL.
On-chain flow matters: holders/supply 7d up = institutions entering (supports BUY); down = exiting (supports SELL).
Macro: if risk_off (low Fear&Greed) → be more cautious, fewer BUYs. If the RWA vs benchmark spread is wide → RWA is attractive.
Funds with no yield data (yield n/a) → HOLD with note "missing data".
Write reasons specific and full of numbers. Do not invent numbers. If not enough evidence → HOLD.
Reply in ENGLISH. You MUST return ONE JSON object with EXACTLY these keys — do not rename, add, or omit:
{"market_view":"2-3 sentence English market overview for a broad audience","crypto_view":"Regime: ...\\nRotation: ...\\nWhat to watch: ...","chain_view":"Liquidity: ...\\nActivity: ...\\nWatch: ...","signals":[{"ticker":"USTBL","action":"BUY|HOLD|SELL","confidence":"low|medium|high","reasons":["reason one","reason two"]}]}
signals must contain exactly one entry for each of the 15 funds, using their tickers as-is. action is exactly "BUY" or "HOLD" or "SELL". confidence is exactly "low" or "medium" or "high". reasons is an array of 1-3 strings.`

const EUR_SET = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1"])

function fmtPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`
}

function benchmarks(funds: Indicator[]) {
  const tbill = funds.find((f) => f.ticker === "USTBL")?.yield ?? 0
  const eur = funds.filter((f) => EUR_SET.has(f.ticker) && f.yield > 0).map((f) => f.yield)
  const eurBest = eur.length ? Math.max(...eur) : 0
  const per = new Map<string, { name: string; yield: number }>()
  for (const f of funds) {
    if (f.yield <= 0) continue
    per.set(
      f.ticker,
      EUR_SET.has(f.ticker) ? { name: "EUR leader", yield: eurBest } : { name: "T-bill (USTBL)", yield: tbill },
    )
  }
  return per
}

function normAction(a: unknown): Signal["action"] {
  const v = String(a ?? "").toUpperCase()
  if (v.includes("BUY")) return "BUY"
  if (v.includes("SELL")) return "SELL"
  return "HOLD"
}

function toSignals(body: Record<string, unknown>): Signal[] {
  const raw = Array.isArray(body.signals)
    ? (body.signals as unknown[])
    : Array.isArray(body.recommendations)
      ? (body.recommendations as unknown[])
      : []
  return raw
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>
      const reasons = Array.isArray(o.reasons) ? (o.reasons as string[]) : o.reason ? [String(o.reason)] : []
      return {
        ticker: String(o.ticker ?? o.fund ?? o.symbol ?? ""),
        action: normAction(o.action ?? o.recommendation),
        confidence: normConf(o.confidence ?? "medium"),
        reasons,
      }
    })
    .filter((s) => s.ticker)
}

export async function analyze(
  snapshotDate: string,
  funds: Indicator[],
  ranks: Map<string, YieldRank>,
  news: NewsSignal[],
  flow: FlowSignal[],
  macro: MacroSignal,
  crypto: CryptoSignal,
  chain: ChainSignal,
): Promise<Report> {
  const bench = benchmarks(funds)
  const fundLines = funds
    .map((f) => {
      const rank = ranks.get(f.ticker)
      const b = bench.get(f.ticker)
      const spread = b && b.yield > 0 ? f.yield - b.yield : null
      const benchTxt = spread === null ? "" : `, vs ${b!.name} ${spread > 0 ? "+" : ""}${spread.toFixed(2)}pt`
      const yTxt = f.yield > 0 ? `yield ${f.yield.toFixed(2)}% (30d ${fmtPct(f.yield_chg_30d_pct)})` : "yield n/a"
      return `${f.ticker}: ${yTxt}, pctile ${(rank?.pctile ?? 0).toFixed(0)}${benchTxt}; TVL 7d ${fmtPct(f.chg_7d_pct)} / 30d ${fmtPct(f.chg_30d_pct)} / 90d ${fmtPct(f.chg_90d_pct)}; holders ${f.holders} (7d ${fmtPct(f.holders_7d_pct)}, 30d ${fmtPct(f.holders_30d_pct)})`
    })
    .join("\n")
  const benchLines = [...new Set([...bench.values()].map((b) => b.name))]
    .map((name) => `- ${name}: ${(bench.values().find((b) => b.name === name)?.yield ?? 0).toFixed(2)}%`)
    .join("\n")
  const newsLines = news.length
    ? news.map((n) => `[${n.direction} conf=${n.confidence} ${n.fund ?? ""}] ${n.topic} — ${n.reason}`).join("\n")
    : "(không có tin)"
  const flowLines = flow
    .map(
      (f) =>
        `[${f.direction}] ${f.ticker}: holders ${f.holders} (7d ${f.holders_7d_pct.toFixed(1)}%), supply 7d ${f.supply_7d_pct.toFixed(1)}% — ${f.note}`,
    )
    .join("\n")
  const macroLine = `${macro.note}`
  const prompt = `NGÀY: ${snapshotDate}

SỐ LIỆU QUỸ:
${fundLines}

BENCHMARK:
${benchLines}

TIN TỨC:
${newsLines}

DÒNG TIỀN ON-CHAIN:
${flowLines}

VĨ MÔ:
${macroLine}

CRYPTO MARKET:
${crypto.note}

ON-CHAIN/BLOCKCHAIN:
${chain.note}`
  try {
    const body = await jsonChat<Record<string, unknown>>(SYS, prompt)
    const llmSignals = toSignals(body)
    const rules = ruleViews(macro, crypto, chain)
    const signals = llmSignals.length ? llmSignals : ruleSignals(funds, ranks, flow)
    return {
      date: snapshotDate,
      generated_at: new Date().toISOString(),
      market_view: str(body.market_view) || rules.market_view,
      crypto_view: str(body.crypto_view) || rules.crypto_view,
      chain_view: str(body.chain_view) || rules.chain_view,
      signals,
      news_used: news,
      flow_used: flow,
      macro_used: macro,
      crypto_used: crypto,
      chain_used: chain,
    }
  } catch (err) {
    console.warn(`analyst LLM fail (${(err as Error).message}) — using rule-based fallback`)
    return fallback(snapshotDate, funds, ranks, news, flow, macro, crypto, chain)
  }
}

function str(v: unknown): string {
  return String(v ?? "")
    .replace(/\\n/g, "\n")
    .trim()
}

function normConf(c: unknown): Signal["confidence"] {
  if (typeof c === "number") {
    if (c >= 0.8) return "high"
    if (c >= 0.5) return "medium"
    return "low"
  }
  const v = String(c ?? "").toLowerCase()
  if (v.includes("high")) return "high"
  if (v.includes("medium") || v.includes("med")) return "medium"
  return "low"
}

function ruleSignals(funds: Indicator[], ranks: Map<string, YieldRank>, flow: FlowSignal[]): Signal[] {
  const flowBy = new Map(flow.map((f) => [f.ticker, f]))
  return funds.map((f) => {
    const rank = ranks.get(f.ticker)
    const pctile = rank?.pctile ?? 0
    const fl = flowBy.get(f.ticker)
    let action: Signal["action"] = "HOLD"
    const reasons: string[] = []
    const inflow = fl?.direction === "inflow"
    const outflow = fl?.direction === "outflow"
    const yUp = f.yield_chg_30d_pct > 10
    const yDown = f.yield_chg_30d_pct < -10
    if (f.yield <= 0) {
      reasons.push(`yield n/a — no yield data`)
    } else if (yUp && !outflow && pctile >= 0.5) {
      action = "BUY"
      reasons.push(
        `yield ${f.yield.toFixed(2)}% rising strongly 30d ${fmtPct(f.yield_chg_30d_pct)}, TVL 7d ${fmtPct(f.chg_7d_pct)}`,
      )
    } else if (yUp && outflow) {
      action = "HOLD"
      reasons.push(
        `yield 30d ${fmtPct(f.yield_chg_30d_pct)} (rising fast) but holders exiting ${fl ? fmtPct(fl.holders_7d_pct) : ""} — keep to capture rising yield, monitor`,
      )
    } else if (yDown && (outflow || f.chg_7d_pct < 0)) {
      action = "SELL"
      reasons.push(
        `yield 30d ${fmtPct(f.yield_chg_30d_pct)} falling + outflows (holders ${fl ? fmtPct(fl.holders_7d_pct) : ""})`,
      )
    } else if (pctile >= 0.8 && f.chg_7d_pct >= 0 && !outflow) {
      action = "BUY"
      reasons.push(`yield ${f.yield.toFixed(2)}% top of cohort, TVL 7d +${f.chg_7d_pct.toFixed(2)}%`)
    } else if (pctile <= 0.2 && f.chg_7d_pct < 0 && !inflow) {
      action = "SELL"
      reasons.push(`yield ${f.yield.toFixed(2)}% bottom of cohort, TVL 7d ${f.chg_7d_pct.toFixed(2)}%`)
    } else if (pctile >= 0.8) {
      reasons.push(`yield ${f.yield.toFixed(2)}% in the top cohort`)
    } else if (inflow) {
      action = "BUY"
      reasons.push(`on-chain inflow: holders 7d +${fl?.holders_7d_pct.toFixed(1)}%`)
    } else if (outflow) {
      action = "SELL"
      reasons.push(`on-chain outflow: holders 7d ${fl?.holders_7d_pct.toFixed(1)}%`)
    } else {
      reasons.push(`yield ${f.yield.toFixed(2)}%, no clear signal yet`)
    }
    return { ticker: f.ticker, action, confidence: "medium", reasons }
  })
}

function ruleViews(
  macro: MacroSignal,
  crypto: CryptoSignal,
  chain: ChainSignal,
): { market_view: string; crypto_view: string; chain_view: string } {
  return {
    market_view: `Rule-based fallback: ${crypto.note ? "15 funds" : "15 funds"}; macro ${macro.risk_level}`,
    crypto_view: `Regime: ${macro.risk_level} (F&G ${macro.fear_greed.value})\nRotation: ${crypto.note || "n/a"}`,
    chain_view: `Liquidity: ${
      chain.defi.stables_usd ? `stablecoins $${(chain.defi.stables_usd / 1e9).toFixed(1)}B` : "n/a"
    }\nActivity: ${chain.btc.tx_24h ? `${chain.btc.tx_24h.toLocaleString("en-US")} BTC tx/24h` : "n/a"}`,
  }
}

function fallback(
  snapshotDate: string,
  funds: Indicator[],
  ranks: Map<string, YieldRank>,
  news: NewsSignal[],
  flow: FlowSignal[],
  macro: MacroSignal,
  crypto: CryptoSignal,
  chain: ChainSignal,
): Report {
  const newsReasons = news.filter((n) => n.direction !== "neutral").map((n) => `[${n.direction}] ${n.topic}`)
  return {
    date: snapshotDate,
    generated_at: new Date().toISOString(),
    market_view: `Rule-based fallback: ${funds.length} funds; macro ${macro.risk_level}; ${newsReasons.length ? "news: " + newsReasons.join("; ") : ""}`,
    crypto_view: ruleViews(macro, crypto, chain).crypto_view,
    chain_view: ruleViews(macro, crypto, chain).chain_view,
    signals: ruleSignals(funds, ranks, flow),
    news_used: news,
    flow_used: flow,
    macro_used: macro,
    crypto_used: crypto,
    chain_used: chain,
  }
}
