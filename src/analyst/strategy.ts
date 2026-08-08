import { mkdirSync, readFileSync, readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { latestSnapshot, type Indicator } from "./data"
import { fetchEstr, fetchSofr } from "./rotation"

const EUR = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1", "bC3M"])
const GBP = new Set(["UKTBL"])

const bucketOf = (f: Indicator): "eur" | "usd" | "gbp" =>
  EUR.has(f.ticker) ? "eur" : GBP.has(f.ticker) ? "gbp" : "usd"

const PAIRS: Array<[string, string, string]> = [
  ["eurSAFO", "SAFO", "Spiko EUR money market vs USD"],
  ["EUTBL", "USTBL", "Spiko EUR T-bill vs USD T-bill"],
  ["EUROB", "USDY", "European bond fund vs Ondo USD yield"],
  ["NRW1", "USTBL", "EUR short-term fund vs USD T-bill"],
]

export interface StratRow {
  ticker: string
  bucket: "eur" | "usd" | "gbp"
  yield: number
  tvl: number
  holders: number
  coverage: number | null
  collateral: number
  carry: number | null
}

export interface Pair {
  a: string
  b: string
  spread_pt: number
  long: string
  short: string
  note: string
}

export interface Strategy {
  date: string
  generated_at: string
  benchmarks: { estr: number | null; sofr: number | null; tbill: number }
  rows: StratRow[]
  ranking: string[]
  pairs: Pair[]
  top: string | null
  signal: string
  note: string
}

const norm = (v: number, max: number) => (max > 0 ? Math.min(1, Math.max(0, v / max)) : 0)

export function computeStrategy(
  date: string,
  funds: Indicator[],
  estr: number | null,
  sofr: number | null,
  coverageBy: Map<string, number>,
): Strategy {
  const tbill = funds.find((f) => f.ticker === "USTBL")?.yield ?? 0
  const maxY = Math.max(...funds.map((f) => f.yield), 1)
  const maxT = Math.max(...funds.map((f) => f.tvl), 1)
  const maxH = Math.max(...funds.map((f) => f.holders), 1)

  const rows: StratRow[] = funds
    .filter((f) => f.yield > 0)
    .map((f) => {
      const b = bucketOf(f)
      const coverage = coverageBy.get(f.ticker) ?? null
      const bench = b === "eur" ? estr : sofr
      const carry = bench !== null ? f.yield - bench : null
      const collateral =
        norm(f.yield, maxY) * 0.4 + norm(f.tvl, maxT) * 0.2 + norm(f.holders, maxH) * 0.15 + (coverage ?? 0) * 0.25
      return {
        ticker: f.ticker,
        bucket: b,
        yield: f.yield,
        tvl: f.tvl,
        holders: f.holders,
        coverage,
        collateral,
        carry,
      }
    })
    .sort((a, b) => b.collateral - a.collateral)

  const pairs: Pair[] = PAIRS.flatMap(([a, b, note]) => {
    const fa = rows.find((r) => r.ticker === a)
    const fb = rows.find((r) => r.ticker === b)
    if (!fa || !fb) return []
    const spread = fa.yield - fb.yield
    return [
      {
        a,
        b,
        spread_pt: spread,
        long: spread >= 0 ? a : b,
        short: spread >= 0 ? b : a,
        note: `${note} — carry ${Math.abs(spread).toFixed(2)}pt`,
      },
    ]
  })

  const top = rows[0] ?? null
  const carry = top?.carry ?? null
  const cov = top?.coverage ?? null
  let signal: string
  let note: string
  if (!top) {
    signal = "N/A"
    note = "no collateral funds available"
  } else if (carry !== null && carry >= 0.75 && cov !== null && cov >= 0.9) {
    signal = `DEPLOY_${top.ticker}`
    note = `${top.ticker} best collateral (score ${(top.collateral * 100).toFixed(0)}/100) with ${carry.toFixed(2)}pt delta-neutral carry and ${(cov * 100).toFixed(0)}% on-chain verification — good perp-ecosystem collateral`
  } else if (carry !== null && carry >= 0.75) {
    signal = `DEPLOY_${top.ticker}`
    note = `${top.ticker} best collateral (score ${(top.collateral * 100).toFixed(0)}/100) with ${carry.toFixed(2)}pt carry, but on-chain coverage ${cov !== null ? (cov * 100).toFixed(0) : "n/a"}% — verify before use`
  } else if (carry !== null && carry < 0) {
    signal = "PARK"
    note = `no positive carry — ${top.ticker} at ${top.yield.toFixed(2)}% vs benchmark — plain T-bill or treasury better`
  } else {
    signal = "HOLD"
    note = `top collateral ${top.ticker} (score ${(top.collateral * 100).toFixed(0)}/100) with ${carry !== null ? carry.toFixed(2) : "n/a"}pt carry — neutral`
  }

  return {
    date,
    generated_at: new Date().toISOString(),
    benchmarks: { estr, sofr, tbill },
    rows,
    ranking: rows.map((r) => r.ticker),
    pairs,
    top: top?.ticker ?? null,
    signal,
    note,
  }
}

async function main() {
  const snap = latestSnapshot()
  const [estr, sofr] = await Promise.all([fetchEstr(), fetchSofr()])

  const data = join(import.meta.dir, "..", "..", "data")
  const vDir = join(data, "verification")
  let coverageBy = new Map<string, number>()
  const vFiles = readdirSync(vDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const vFile = vFiles.at(-1)
  if (vFile) {
    const v = JSON.parse(readFileSync(join(vDir, vFile), "utf8")) as {
      funds: Array<{ ticker: string; coverage: number }>
    }
    coverageBy = new Map(v.funds.map((f) => [f.ticker, f.coverage]))
  }

  const strat = computeStrategy(snap.date, snap.funds, estr, sofr, coverageBy)

  mkdirSync(join(data, "strategy"), { recursive: true })
  const file = join(data, "strategy", `${snap.date}.json`)
  await writeFile(file, JSON.stringify(strat, null, 2))

  console.log(`=== EuroRWA Strategy Signals — ${snap.date} ===`)
  console.log(
    `benchmarks: ESTR ${strat.benchmarks.estr?.toFixed(3) ?? "n/a"}% · SOFR ${strat.benchmarks.sofr?.toFixed(2) ?? "n/a"}% · T-bill ${strat.benchmarks.tbill.toFixed(2)}%`,
  )
  console.table(
    strat.rows.map((r) => ({
      ticker: r.ticker,
      bucket: r.bucket,
      yield: r.yield.toFixed(2),
      cov: r.coverage === null ? "n/a" : `${(r.coverage * 100).toFixed(0)}%`,
      score: (r.collateral * 100).toFixed(0),
      carry: r.carry === null ? "n/a" : r.carry.toFixed(2),
    })),
  )
  if (strat.pairs.length) {
    console.log("pairs:")
    for (const p of strat.pairs) {
      console.log(`  ${p.long} vs ${p.short} — ${p.note}`)
    }
  }
  console.log(`signal: ${strat.signal}`)
  console.log(`  ${strat.note}`)
  console.log(`-> ${file}`)
}

if (import.meta.main) await main()
