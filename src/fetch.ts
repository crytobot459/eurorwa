import { mkdirSync } from "node:fs"
import { join } from "node:path"

const WATCH = [
  "EUTBL",
  "UKTBL",
  "NRW1",
  "bC3M",
  "eurSAFO",
  "SAFO",
  "EURC",
  "BUIDL",
  "USYC",
  "USDY",
  "CETES",
  "USTBL",
  "AAULF",
  "EUROB",
  "bIB01",
]

interface Metric {
  val?: number | null
  val_7d?: number | null
  val_30d?: number | null
  val_90d?: number | null
  chg_7d_pct?: number | null
  chg_30d_pct?: number | null
  chg_90d_pct?: number | null
}

interface Token {
  network_name?: string
  address?: string
  standards?: string[]
}

interface Asset {
  slug?: string
  ticker?: string
  name?: string
  issuer_name?: string
  asset_class_name?: string
  total_asset_value_dollar?: Metric
  circulating_market_value_dollar?: Metric
  apy_7_day?: Metric
  holding_addresses_count?: Metric
  total_supply_token?: Metric
  tokens?: Token[]
}

interface Fund {
  ticker: string
  slug: string
  name: string
  issuer: string
  asset_class: string
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
  supply: number
  networks: string[]
}

const pickNum = (
  m: Metric | undefined,
  k: "val" | "val_7d" | "val_30d" | "chg_7d_pct" | "chg_30d_pct" | "chg_90d_pct",
) => m?.[k] ?? null

async function getAsset(ticker: string): Promise<Asset | null> {
  const res = await fetch(`https://app.rwa.xyz/assets/${ticker}`, {
    headers: { "User-Agent": "EuroRWA-dashboard/0.1 (personal project)" },
  })
  if (!res.ok) throw new Error(`${ticker}: http ${res.status}`)
  const html = await res.text()
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) throw new Error(`${ticker}: no __NEXT_DATA__`)
  return JSON.parse(m[1]).props?.pageProps?.asset ?? null
}

function norm(a: Asset): Fund {
  const tvl = a.total_asset_value_dollar ?? a.circulating_market_value_dollar
  const yld = a.apy_7_day
  const hold = a.holding_addresses_count
  const sup = a.total_supply_token
  return {
    ticker: a.ticker ?? a.slug ?? "?",
    slug: a.slug ?? a.ticker ?? "?",
    name: a.name ?? "",
    issuer: a.issuer_name ?? "",
    asset_class: a.asset_class_name ?? "",
    tvl: pickNum(tvl, "val") ?? 0,
    tvl_7d: pickNum(tvl, "val_7d") ?? 0,
    chg_7d_pct: pickNum(tvl, "chg_7d_pct") ?? 0,
    chg_30d_pct: pickNum(tvl, "chg_30d_pct") ?? 0,
    chg_90d_pct: pickNum(tvl, "chg_90d_pct") ?? 0,
    yield: pickNum(yld, "val") ?? 0,
    yield_30d: pickNum(yld, "val_30d") ?? 0,
    yield_chg_30d_pct: pickNum(yld, "chg_30d_pct") ?? 0,
    yield_chg_90d_pct: pickNum(yld, "chg_90d_pct") ?? 0,
    holders: pickNum(hold, "val") ?? 0,
    holders_7d_pct: pickNum(hold, "chg_7d_pct") ?? 0,
    holders_30d_pct: pickNum(hold, "chg_30d_pct") ?? 0,
    supply: pickNum(sup, "val") ?? 0,
    networks: (a.tokens ?? []).map((t) => t.network_name ?? "").filter(Boolean),
  }
}

async function fetchWeb(): Promise<Fund[]> {
  const results = await Promise.allSettled(WATCH.map((t) => getAsset(t)))
  const funds: Fund[] = []
  const failed: string[] = []
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) funds.push(norm(r.value))
    else failed.push(`${WATCH[i]} (${(r as PromiseRejectedResult).reason?.message ?? "?"})`)
  })
  if (failed.length) console.warn(`skip ${failed.length}: ${failed.join("; ")}`)
  return funds.sort((x, y) => y.tvl - x.tvl)
}

function mock(): Fund[] {
  const raw: [string, number, number, number, number][] = [
    ["USYC", 3.0e9, 0.04, 4.1, 0],
    ["BUIDL", 2.7e9, 2.54, 3.47, 0],
    ["USDY", 2.2e9, -0.06, 3.9, 0],
    ["eurSAFO", 933.8e6, 3.7, 3.5, 0],
    ["EUTBL", 898.5e6, -4.27, 3.2, 0],
    ["SAFO", 150.2e6, 0.65, 4.2, 0],
    ["NRW1", 115.1e6, 1.06, 3.1, 0],
    ["UKTBL", 18.5e6, -0.59, 3.6, 0],
    ["bC3M", 10.0e6, 1.55, 3.1, 0],
    ["CETES", 5.4e6, 0.77, 3.0, 0],
    ["EURC", 1.0e9, 0.0, 0.0, 0],
    ["USTBL", 145.5e6, -0.63, 4.34, 0],
    ["AAULF", 16.1e6, -1.83, 3.5, 0],
    ["bIB01", 12.4e6, 0.08, 4.2, 0],
    ["EUROB", 401, 1.09, 1.46, 0],
  ]
  return raw.map(([ticker, tvl, chg, yld, supply]) => ({
    ticker,
    slug: ticker.toLowerCase(),
    name: ticker,
    issuer: "",
    asset_class: "Non-U.S. Government Debt",
    tvl,
    tvl_7d: tvl / (1 + chg / 100),
    chg_7d_pct: chg,
    chg_30d_pct: 0,
    chg_90d_pct: 0,
    yield: yld,
    yield_30d: yld,
    yield_chg_30d_pct: 0,
    yield_chg_90d_pct: 0,
    holders: 0,
    holders_7d_pct: 0,
    holders_30d_pct: 0,
    supply,
    networks: [],
  }))
}

async function main() {
  let funds: Fund[]
  let source = "rwa.xyz-web"
  try {
    funds = await fetchWeb()
  } catch (err) {
    console.warn(`web scrape failed (${err}) — using mock`)
    funds = mock()
    source = "mock"
  }
  if (!funds.length) {
    console.warn("no funds scraped — using mock")
    funds = mock()
    source = "mock"
  }
  const today = new Date().toISOString().slice(0, 10)
  const dir = join(import.meta.dir, "..", "data", "snapshots")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${today}.json`)
  await Bun.write(file, JSON.stringify({ date: today, fetched_at: new Date().toISOString(), source, funds }, null, 2))
  console.log(`${source}: ${funds.length} funds -> ${file}`)
  console.table(funds.map((f) => ({ ticker: f.ticker, tvl: f.tvl, chg: f.chg_7d_pct, yld: f.yield, hold: f.holders })))
}

await main()
