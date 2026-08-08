import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { latestSnapshot, type Indicator } from "./data"

const EUR = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1", "bC3M"])
const GBP = new Set(["UKTBL"])
const STAB = new Set(["EURC"])

export interface Bench {
  estr: number | null
  sofr: number | null
  tbill: number
  src: string
}

export interface RotRow {
  ticker: string
  bucket: "eur" | "usd" | "gbp" | "other"
  yield: number
  hedged: number | null
}

export interface Rotation {
  date: string
  generated_at: string
  benchmarks: Bench
  rows: RotRow[]
  best_eur: RotRow | null
  best_usd: RotRow | null
  signal: "ROTATE_EUR" | "ROTATE_USD" | "HOLD" | "N/A"
  gap_pt: number | null
  note: string
}

const bucketOf = (f: Indicator): RotRow["bucket"] =>
  EUR.has(f.ticker) ? "eur" : GBP.has(f.ticker) ? "gbp" : STAB.has(f.ticker) ? "other" : "usd"

export async function fetchEstr(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT?lastNObservations=1&format=jsondata",
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return null
    const j = (await res.json()) as {
      dataSets?: { series?: Record<string, { observations?: Record<string, [number, ...unknown[]]> }> }[]
    }
    const obs = j?.dataSets?.[0]?.series?.["0:0:0"]?.observations
    if (!obs) return null
    const keys = Object.keys(obs)
    if (!keys.length) return null
    const v = obs[keys[keys.length - 1]]?.[0]
    return typeof v === "number" && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

export async function fetchSofr(): Promise<number | null> {
  try {
    const res = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=SOFR&cosd=2026-01-01", {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const txt = await res.text()
    const lines = txt.trim().split("\n").slice(1)
    for (let i = lines.length - 1; i >= 0; i--) {
      const cell = lines[i].split(",")[1]
      const v = Number(cell)
      if (Number.isFinite(v)) return v
    }
    return null
  } catch {
    return null
  }
}

export function computeRotation(
  date: string,
  funds: Indicator[],
  estr: number | null,
  sofr: number | null,
  src: string,
): Rotation {
  const tbill = funds.find((f) => f.ticker === "USTBL")?.yield ?? 0
  const rows: RotRow[] = funds
    .filter((f) => f.yield > 0)
    .map((f) => {
      const b = bucketOf(f)
      const hedged = b === "eur" && estr !== null && sofr !== null ? f.yield + (sofr - estr) : null
      return { ticker: f.ticker, bucket: b, yield: f.yield, hedged }
    })

  const eurs = rows.filter((r) => r.bucket === "eur" && r.hedged !== null)
  const usds = rows.filter((r) => r.bucket === "usd")
  const best_eur = eurs.sort((a, b) => (b.hedged ?? 0) - (a.hedged ?? 0))[0] ?? null
  const best_usd = [...usds].sort((a, b) => b.yield - a.yield)[0] ?? null

  let signal: Rotation["signal"] = "N/A"
  let gap: number | null = null
  let note = "rotation unavailable — benchmark data missing"
  if (best_eur && best_usd && best_eur.hedged !== null) {
    gap = best_eur.hedged - best_usd.yield
    if (gap >= 0.5) signal = "ROTATE_EUR"
    else if (gap <= -0.5) signal = "ROTATE_USD"
    else signal = "HOLD"
    note =
      `best hedged EUR ${best_eur.ticker} ${best_eur.hedged.toFixed(2)}% vs best USD ${best_usd.ticker} ${best_usd.yield.toFixed(2)}% ` +
      `(gap ${gap >= 0 ? "+" : ""}${gap.toFixed(2)}pt) — ${signal === "ROTATE_EUR" ? "hedge EUR-ward to capture the carry" : signal === "ROTATE_USD" ? "stay USD — EUR carry unattractive after hedging" : "no edge either way"}`
  } else if (best_eur || best_usd) {
    note = "partial benchmarks — hedging calc incomplete"
  }

  return {
    date,
    generated_at: new Date().toISOString(),
    benchmarks: { estr, sofr, tbill, src },
    rows,
    best_eur,
    best_usd,
    signal,
    gap_pt: gap,
    note,
  }
}

async function main() {
  const snap = latestSnapshot()
  const [estr, sofr] = await Promise.all([fetchEstr(), fetchSofr()])
  const src = [estr !== null ? "ecb" : null, sofr !== null ? "fred" : null].filter(Boolean).join("+") || "none"
  const rot = computeRotation(snap.date, snap.funds, estr, sofr, src)

  const dir = join(import.meta.dir, "..", "..", "data", "rotation")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${snap.date}.json`)
  await writeFile(file, JSON.stringify(rot, null, 2))

  console.log(`=== EuroRWA Yield Rotation — ${snap.date} ===`)
  console.log(
    `benchmarks: ESTR ${rot.benchmarks.estr?.toFixed(3) ?? "n/a"}% · SOFR ${rot.benchmarks.sofr?.toFixed(2) ?? "n/a"}% · T-bill ${rot.benchmarks.tbill.toFixed(2)}% (src ${rot.benchmarks.src})`,
  )
  console.table(
    rot.rows.map((r) => ({
      ticker: r.ticker,
      bucket: r.bucket,
      yield: r.yield,
      hedged: r.hedged === null ? "n/a" : r.hedged.toFixed(2),
    })),
  )
  console.log(
    `signal: ${rot.signal} | gap ${rot.gap_pt === null ? "n/a" : (rot.gap_pt >= 0 ? "+" : "") + rot.gap_pt.toFixed(2)}pt`,
  )
  console.log(`  ${rot.note}`)
  console.log(`-> ${file}`)
}

if (import.meta.main) await main()
