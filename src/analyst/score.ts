import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Fund, Indicator, YieldRank } from "./data"
import type { Signal } from "./analyst"

export interface Score {
  ticker: string
  score: number
  yield_p: number
  momentum: number
  flow: number
  stability: number
  confidence: "low" | "medium" | "high"
}

export interface HitRate {
  n: number
  hits: number
  rate: number | null
}

const W_YIELD = 40
const W_MOM = 25
const W_FLOW = 20
const W_STAB = 15

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

const r1 = (v: number) => Math.round(v * 10) / 10

export function confidence(f: Indicator, cohortSize: number): "low" | "medium" | "high" {
  if (f.yield <= 0) return "low"
  if (cohortSize < 3) return "low"
  if (f.holders > 0 && f.yield_chg_30d_pct !== 0) return "high"
  return "medium"
}

export function computeScores(funds: Indicator[], ranks: Map<string, YieldRank>): Score[] {
  const cohort = funds.filter((f) => f.yield > 0)
  return funds.map((f) => {
    const hasYield = f.yield > 0
    const pctile = hasYield ? (ranks.get(f.ticker)?.pctile ?? 0) : 0
    const yieldP = hasYield ? pctile * W_YIELD : 0
    const momentum = hasYield ? W_MOM * clamp(0.5 + f.yield_chg_30d_pct / 40, 0, 1) : 0
    const flow = W_FLOW * clamp(0.5 + (f.holders_7d_pct + f.chg_7d_pct) / 40, 0, 1)
    const stability = W_STAB * clamp(Math.log10(Math.max(f.holders, 1)) / 6, 0, 1)
    return {
      ticker: f.ticker,
      score: r1(yieldP + momentum + flow + stability),
      yield_p: r1(yieldP),
      momentum: r1(momentum),
      flow: r1(flow),
      stability: r1(stability),
      confidence: confidence(f, cohort.length),
    }
  })
}

export function hitRate(): HitRate {
  const data = join(import.meta.dir, "..", "..", "data")
  const snapDir = join(data, "snapshots")
  const repDir = join(data, "analyst")
  if (!exists(snapDir) || !exists(repDir)) return { n: 0, hits: 0, rate: null }
  const snapFiles = readdirSync(snapDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const repFiles = readdirSync(repDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  if (snapFiles.length < 2) return { n: 0, hits: 0, rate: null }
  const yields = new Map<string, Map<string, number>>()
  for (const f of snapFiles) {
    const d = f.replace(".json", "")
    const s = JSON.parse(readFileSync(join(snapDir, f), "utf8")) as { funds: Fund[] }
    yields.set(d, new Map(s.funds.map((x) => [x.ticker, x.yield ?? 0])))
  }
  const dates = [...yields.keys()].sort()
  let hits = 0
  let n = 0
  for (const rf of repFiles) {
    const d = rf.replace(".json", "")
    const at = yields.get(d)
    const next = dates.find((x) => x > d)
    if (!at || !next) continue
    const nxt = yields.get(next)!
    const rep = JSON.parse(readFileSync(join(repDir, rf), "utf8")) as { signals?: Signal[] }
    for (const s of rep.signals ?? []) {
      const prev = at.get(s.ticker)
      const y = nxt.get(s.ticker)
      if (prev == null || y == null || prev <= 0) continue
      if (s.action !== "HOLD") n++
      if (s.action === "BUY" && y > prev) hits++
      else if (s.action === "SELL" && y < prev) hits++
    }
  }
  return { n, hits, rate: n ? hits / n : null }
}

function exists(p: string): boolean {
  try {
    readdirSync(p)
    return true
  } catch {
    return false
  }
}
