import type { Report } from "./analyst"
import type { FlowSignal } from "./flow"

export type Severity = "info" | "warning" | "high"

interface FundLike {
  ticker: string
  name: string
  tvl: number
  yield: number
  holders: number
  holders_7d_pct: number
}

export interface Alert {
  id: string
  type: "yield-breakout" | "yield-cohort" | "tvl-spike" | "holder-surge" | "regime-flip"
  severity: Severity
  ticker?: string
  title: string
  detail: string
  date: string
}

const EUR = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1", "bC3M"])
const curOf = (f: FundLike) =>
  EUR.has(f.ticker) || /EUR/i.test(f.name) ? "eur" : /UK|GBP/i.test(f.ticker + " " + f.name) ? "gbp" : "usd"

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`
const usd = (v: number) => (Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(1)}M`)

const YIELD_PT = 0.25
const TVL_PCT = 5
const HOLDER_PCT = 10

export function detectAlerts(
  cur: FundLike[],
  prev: FundLike[],
  curRep: Report | null,
  prevRep: Report | null,
  date: string,
): Alert[] {
  const alerts: Alert[] = []
  const prevBy = new Map(prev.map((f) => [f.ticker, f]))

  const byCur = new Map<string, number[]>()
  for (const f of cur) {
    if (f.yield > 0) {
      const list = byCur.get(curOf(f)) ?? []
      list.push(f.yield)
      byCur.set(curOf(f), list)
    }
  }
  const med = (c: string) => {
    const l = (byCur.get(c) ?? []).sort((a, b) => a - b)
    return l.length ? l[Math.floor(l.length / 2)] : null
  }

  for (const f of cur) {
    const p = prevBy.get(f.ticker)
    if (f.yield > 0 && p && p.yield > 0 && Math.abs(f.yield - p.yield) >= YIELD_PT) {
      const up = f.yield > p.yield
      alerts.push({
        id: `yield-breakout-${f.ticker}-${date}`,
        type: "yield-breakout",
        severity: "warning",
        ticker: f.ticker,
        title: `${f.ticker} yield ${up ? "broke out" : "dropped"} ${Math.abs(f.yield - p.yield).toFixed(2)}pt`,
        detail: `${f.ticker} yield ${p.yield.toFixed(2)}% → ${f.yield.toFixed(2)}% vs prior day${up ? " (positive signal)" : " (watch outflows)"}`,
        date,
      })
    }
    if (f.yield > 0) {
      const m = med(curOf(f))
      if (m !== null && m > 0) {
        const diff = f.yield - m
        if (diff >= 0.75) {
          alerts.push({
            id: `yield-cohort-${f.ticker}-${date}`,
            type: "yield-cohort",
            severity: "info",
            ticker: f.ticker,
            title: `${f.ticker} top of ${curOf(f).toUpperCase()} cohort`,
            detail: `${f.ticker} ${f.yield.toFixed(2)}% vs cohort median ${m.toFixed(2)}% (+${diff.toFixed(2)}pt)`,
            date,
          })
        } else if (diff <= -0.75) {
          alerts.push({
            id: `yield-cohort-${f.ticker}-${date}`,
            type: "yield-cohort",
            severity: "info",
            ticker: f.ticker,
            title: `${f.ticker} bottom of ${curOf(f).toUpperCase()} cohort`,
            detail: `${f.ticker} ${f.yield.toFixed(2)}% vs cohort median ${m.toFixed(2)}% (${diff.toFixed(2)}pt)`,
            date,
          })
        }
      }
    }
    if (p) {
      const tvlChg = p.tvl > 0 ? ((f.tvl - p.tvl) / p.tvl) * 100 : 0
      if (Math.abs(tvlChg) >= TVL_PCT || Math.abs(f.tvl - p.tvl) >= 100_000_000) {
        const inflow = f.tvl > p.tvl
        alerts.push({
          id: `tvl-spike-${f.ticker}-${date}`,
          type: "tvl-spike",
          severity: "warning",
          ticker: f.ticker,
          title: `${f.ticker} TVL ${inflow ? "surged" : "plunged"} ${pct(tvlChg)}`,
          detail: `${f.ticker} TVL ${usd(p.tvl)} → ${usd(f.tvl)} (${inflow ? "inflows" : "outflows"})`,
          date,
        })
      }
    }
  }
  for (const fl of curRep?.flow_used ?? ([] as FlowSignal[])) {
    if (Math.abs(fl.holders_7d_pct) >= HOLDER_PCT) {
      const inflow = fl.holders_7d_pct > 0
      alerts.push({
        id: `holder-surge-${fl.ticker}-${date}`,
        type: "holder-surge",
        severity: inflow ? "info" : "warning",
        ticker: fl.ticker,
        title: `Holders ${inflow ? "surged" : "exited"} ${pct(fl.holders_7d_pct)} on ${fl.ticker}`,
        detail: `${fl.ticker} holders ${fl.holders} (7d ${pct(fl.holders_7d_pct)}) — ${inflow ? "institutions entering" : "institutions exiting"}`,
        date,
      })
    }
  }

  const curRisk = curRep?.macro_used?.risk_level
  const prevRisk = prevRep?.macro_used?.risk_level
  if (curRisk && prevRisk && curRisk !== prevRisk) {
    alerts.push({
      id: `regime-flip-${date}`,
      type: "regime-flip",
      severity: curRisk === "risk_off" ? "high" : "warning",
      title: `Macro regime flipped: ${prevRisk} → ${curRisk}`,
      detail: `Fear & Greed ${curRep?.macro_used?.fear_greed?.value ?? "n/a"} (${curRep?.macro_used?.fear_greed?.label ?? "n/a"}) — RWA vs T-bill spread ${curRep?.macro_used?.spread?.toFixed(2) ?? "n/a"}pt`,
      date,
    })
  }

  return alerts
}
