import { jsonChat } from "./llm"
import type { Indicator, YieldRank } from "./data"
import type { NewsSignal } from "./news"
import type { FlowSignal } from "./flow"
import type { MacroSignal } from "./macro"

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
  signals: Signal[]
  news_used: NewsSignal[]
  flow_used: FlowSignal[]
  macro_used: MacroSignal
}

const SYS = `You are AnalystAgent — an expert in tokenized RWA money-market funds (tokenized treasury funds).
Input: (1) fund table (yield + 30/90d trends, TVL 7/30/90d, holders), (2) news signals, (3) on-chain flows (holders/supply 7d), (4) macro (Fear&Greed, BTC, RWA vs T-bill yield spread).
Your job: for EACH fund give a recommendation BUY (buy/add because yield is high or rising), HOLD (keep), SELL (exit because yield is low, falling, or risky).
BUY criteria: top yield cohort or yield_30d rising strongly + inflows (TVL/holders up) or positive news. SELL: lowest yield cohort + outflows, or yield dropping fast. Otherwise HOLD.
30/90d trends matter a lot: positive yield_chg_30d_pct = yield rising (supports BUY/HOLD); strongly negative = yield falling (supports SELL). If yield rises fast but holders withdraw (profit-taking) → consider HOLD instead of rushing SELL.
On-chain flow matters: holders/supply 7d up = institutions entering (supports BUY); down = exiting (supports SELL).
Macro: if risk_off (low Fear&Greed) → be more cautious, fewer BUYs. If the RWA vs benchmark spread is wide → RWA is attractive.
Funds with 0.00% yield or missing data → HOLD with note "missing data".
Write reasons specific and full of numbers. Do not invent numbers. If not enough evidence → HOLD.
Reply in ENGLISH. Return ONLY JSON:
{"market_view":"2-3 sentence English market overview for a broad audience","signals":[{"ticker","action","confidence","reasons":[...]}]}`

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

export async function analyze(
  snapshotDate: string,
  funds: Indicator[],
  ranks: Map<string, YieldRank>,
  news: NewsSignal[],
  flow: FlowSignal[],
  macro: MacroSignal,
): Promise<Report> {
  const bench = benchmarks(funds)
  const fundLines = funds
    .map((f) => {
      const rank = ranks.get(f.ticker)
      const b = bench.get(f.ticker)
      const spread = b && b.yield > 0 ? f.yield - b.yield : null
      const benchTxt = spread === null ? "" : `, vs ${b!.name} ${spread > 0 ? "+" : ""}${spread.toFixed(2)}pt`
      return `${f.ticker}: yield ${f.yield.toFixed(2)}% (30d ${fmtPct(f.yield_chg_30d_pct)}), pctile ${(rank?.pctile ?? 0).toFixed(0)}${benchTxt}; TVL 7d ${fmtPct(f.chg_7d_pct)} / 30d ${fmtPct(f.chg_30d_pct)} / 90d ${fmtPct(f.chg_90d_pct)}; holders ${f.holders} (7d ${fmtPct(f.holders_7d_pct)}, 30d ${fmtPct(f.holders_30d_pct)})`
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
${macroLine}`
  try {
    const body = await jsonChat<{
      market_view: string
      signals: (Omit<Signal, "confidence"> & { confidence: string | number })[]
    }>(SYS, prompt)
    return {
      date: snapshotDate,
      generated_at: new Date().toISOString(),
      market_view: body.market_view,
      signals: body.signals.map((s) => ({
        ticker: s.ticker,
        action: s.action,
        confidence: normConf(s.confidence),
        reasons: s.reasons,
      })),
      news_used: news,
      flow_used: flow,
      macro_used: macro,
    }
  } catch (err) {
    console.warn(`analyst LLM fail (${err}) — using rule-based fallback`)
    return fallback(snapshotDate, funds, ranks, news, flow, macro)
  }
}

function normConf(c: string | number): Signal["confidence"] {
  if (typeof c === "number") {
    if (c >= 0.8) return "high"
    if (c >= 0.5) return "medium"
    return "low"
  }
  const v = c.toLowerCase()
  if (v.includes("high")) return "high"
  if (v.includes("medium") || v.includes("med")) return "medium"
  return "low"
}

function fallback(
  snapshotDate: string,
  funds: Indicator[],
  ranks: Map<string, YieldRank>,
  news: NewsSignal[],
  flow: FlowSignal[],
  macro: MacroSignal,
): Report {
  const flowBy = new Map(flow.map((f) => [f.ticker, f]))
  const signals: Signal[] = funds.map((f) => {
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
      reasons.push(`yield 0.00% — missing data or fund pays no yield`)
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
  const newsReasons = news.filter((n) => n.direction !== "neutral").map((n) => `[${n.direction}] ${n.topic}`)
  return {
    date: snapshotDate,
    generated_at: new Date().toISOString(),
    market_view: `Rule-based fallback: ${funds.length} funds; macro ${macro.risk_level}; ${newsReasons.length ? "news: " + newsReasons.join("; ") : ""}`,
    signals,
    news_used: news,
    flow_used: flow,
    macro_used: macro,
  }
}
