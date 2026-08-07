import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

export interface Fund {
  ticker: string
  name: string
  issuer: string
  tvl: number
  tvl_7d: number
  chg_7d_pct: number
  chg_30d_pct: number
  chg_90d_pct: number
  yield: number
  yield_30d: number
  yield_chg_30d_pct: number
  yield_chg_90d_pct: number
  holders: number
  holders_7d_pct: number
  holders_30d_pct: number
}

export interface Indicator {
  ticker: string
  yield: number
  yield_30d: number
  yield_chg_30d_pct: number
  yield_chg_90d_pct: number
  chg_7d_pct: number
  chg_30d_pct: number
  chg_90d_pct: number
  holders: number
  holders_7d_pct: number
  holders_30d_pct: number
  tvl: number
  tvl_7d: number
}

export interface Snapshot {
  date: string
  funds: Indicator[]
}

export function latestSnapshot(): Snapshot {
  const dir = join(import.meta.dir, "..", "..", "data", "snapshots")
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const file = files.at(-1)
  if (!file) throw new Error("no snapshot yet — run bun run fetch first")
  const snap = JSON.parse(readFileSync(join(dir, file), "utf8")) as { date: string; funds: Fund[] }
  return {
    date: snap.date,
    funds: snap.funds.map((f) => ({
      ticker: f.ticker,
      yield: f.yield ?? 0,
      yield_30d: f.yield_30d ?? 0,
      yield_chg_30d_pct: f.yield_chg_30d_pct ?? 0,
      yield_chg_90d_pct: f.yield_chg_90d_pct ?? 0,
      chg_7d_pct: f.chg_7d_pct ?? 0,
      chg_30d_pct: f.chg_30d_pct ?? 0,
      chg_90d_pct: f.chg_90d_pct ?? 0,
      holders: f.holders ?? 0,
      holders_7d_pct: f.holders_7d_pct ?? 0,
      holders_30d_pct: f.holders_30d_pct ?? 0,
      tvl: f.tvl ?? 0,
      tvl_7d: f.tvl_7d ?? 0,
    })),
  }
}

export interface YieldRank {
  ticker: string
  yield: number
  pctile: number
}

export function analyze(snap: Snapshot): { funds: Indicator[]; ranks: Map<string, YieldRank> } {
  const y = snap.funds.filter((f) => f.yield > 0).sort((a, b) => b.yield - a.yield)
  const ranks = new Map<string, YieldRank>()
  y.forEach((f, i) => {
    ranks.set(f.ticker, { ticker: f.ticker, yield: f.yield, pctile: (y.length - i) / y.length })
  })
  return { funds: snap.funds, ranks }
}
