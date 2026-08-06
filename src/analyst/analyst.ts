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

const SYS = `Bạn là AnalystAgent — chuyên gia phân tích tokenized RWA money-market funds (quỹ treasury token hóa).
Đầu vào: (1) bảng số liệu quỹ (yield + xu hướng 30/90d, TVL 7/30/90d, holders), (2) tín hiệu tin tức, (3) dòng tiền on-chain (holders/supply 7d), (4) tình hình vĩ mô (Fear&Greed, BTC, chênh yield RWA vs T-bill).
Việc của bạn: với MỖI quỹ đưa ra khuyến nghị BUY (nên mua/nắm giữ thêm vì yield cao hoặc tăng), HOLD (giữ), SELL (nên bán/rút vì yield thấp, giảm, hoặc rủi ro).
Tiêu chí BUY: yield nhóm cao hoặc yield_30d đang tăng mạnh + dòng tiền vào (TVL/holders tăng) hoặc tin tích cực. SELL: yield nhóm thấp nhất + dòng tiền ra, hoặc yield đang giảm mạnh. Còn lại HOLD.
Xu hướng 30/90d rất quan trọng: yield_chg_30d_pct cao (+) = yield đang tăng (động lực ủng hộ BUY/HOLD); âm mạnh = yield đang giảm (ủng hộ SELL). Nếu yield tăng mạnh nhưng holders rút (chốt lời) → cân nhắc HOLD thay vì SELL vội.
Flow on-chain quan trọng: holders/supply 7d tăng = tổ chức đang vào (ủng hộ BUY); giảm = rút (ủng hộ SELL).
Macro: nếu risk_off (Fear&Greed thấp) → thận trọng hơn, ít BUY. Nếu spread yield RWA vs benchmark rộng → RWA hấp dẫn.
Quỹ có yield 0.00% hoặc thiếu dữ liệu → HOLD kèm ghi chú "thiếu dữ liệu".
Viết reasons cụ thể có số liệu. Không bịa số. Nếu không đủ căn cứ → HOLD.
Trả CHỈ JSON:
{"market_view":"1-2 câu tổng quan thị trường","signals":[{"ticker","action","confidence","reasons":[...]}]}`

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
    console.warn(`analyst LLM fail (${err}) — dùng fallback quy tắc`)
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
      reasons.push(`yield 0.00% — thiếu dữ liệu hoặc quỹ không trả yield`)
    } else if (yUp && !outflow && pctile >= 0.5) {
      action = "BUY"
      reasons.push(
        `yield ${f.yield.toFixed(2)}% đang tăng mạnh 30d ${fmtPct(f.yield_chg_30d_pct)}, TVL 7d ${fmtPct(f.chg_7d_pct)}`,
      )
    } else if (yUp && outflow) {
      action = "HOLD"
      reasons.push(
        `yield 30d ${fmtPct(f.yield_chg_30d_pct)} (đang tăng mạnh) nhưng holders rút ${fl ? fmtPct(fl.holders_7d_pct) : ""} — giữ để hưởng yield tăng, theo dõi tiếp`,
      )
    } else if (yDown && (outflow || f.chg_7d_pct < 0)) {
      action = "SELL"
      reasons.push(
        `yield 30d ${fmtPct(f.yield_chg_30d_pct)} đang giảm + dòng ra (holders ${fl ? fmtPct(fl.holders_7d_pct) : ""})`,
      )
    } else if (pctile >= 0.8 && f.chg_7d_pct >= 0 && !outflow) {
      action = "BUY"
      reasons.push(`yield ${f.yield.toFixed(2)}% top nhóm, TVL 7d +${f.chg_7d_pct.toFixed(2)}%`)
    } else if (pctile <= 0.2 && f.chg_7d_pct < 0 && !inflow) {
      action = "SELL"
      reasons.push(`yield ${f.yield.toFixed(2)}% nhóm thấp, TVL 7d ${f.chg_7d_pct.toFixed(2)}%`)
    } else if (pctile >= 0.8) {
      reasons.push(`yield ${f.yield.toFixed(2)}% thuộc nhóm cao`)
    } else if (inflow) {
      action = "BUY"
      reasons.push(`on-chain inflow: holders 7d +${fl?.holders_7d_pct.toFixed(1)}%`)
    } else if (outflow) {
      action = "SELL"
      reasons.push(`on-chain outflow: holders 7d ${fl?.holders_7d_pct.toFixed(1)}%`)
    } else {
      reasons.push(`yield ${f.yield.toFixed(2)}%, chưa đủ tín hiệu rõ ràng`)
    }
    return { ticker: f.ticker, action, confidence: "medium", reasons }
  })
  const newsReasons = news.filter((n) => n.direction !== "neutral").map((n) => `[${n.direction}] ${n.topic}`)
  return {
    date: snapshotDate,
    generated_at: new Date().toISOString(),
    market_view: `Fallback quy tắc: ${funds.length} quỹ; macro ${macro.risk_level}; ${newsReasons.length ? "tin: " + newsReasons.join("; ") : ""}`,
    signals,
    news_used: news,
    flow_used: flow,
    macro_used: macro,
  }
}
