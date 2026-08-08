export const API = import.meta.env.VITE_API ?? "http://localhost:3000"

export interface FundRow {
  slug: string
  ticker: string
  name: string
  issuer: string
  asset_class: string
  tvl: number
  chg_7d_pct: number
  yield: number
  holders: number
  nav: number | null
  integrity: string
  checks: { self?: boolean; nav?: boolean; yield?: boolean } | null
  onchain: { status: string; coverage: number; verified: number; supply: number } | null
  date: string
}

export interface Point {
  date: string
  tvl: number
  chg_7d_pct: number
  yield: number
  holders: number
}

export interface FundDetail {
  fund: Omit<FundRow, "tvl" | "chg_7d_pct" | "yield" | "holders" | "nav" | "integrity" | "date">
  history: Point[]
}

export interface Flow {
  ticker: string
  slug: string
  flow: number | null
  tvl: number
  chg_7d_pct: number
}

export interface Concentration {
  top3_pct: number
  top5_pct: number
  top10_pct: number
  hhi: number
}

export interface Breadth {
  yield_funds: number
  median_yield: number | null
  max_yield: number | null
  min_yield: number | null
  spread: number | null
}

export interface SplitRow {
  tvl: number
  count: number
  share: number
}

export interface Analytics {
  date: string | null
  prev_date: string | null
  total_tvl: number
  fund_count: number
  concentration: Concentration
  breadth: Breadth
  currency: Record<string, SplitRow>
  chains: (SplitRow & { name: string })[]
  issuers: (SplitRow & { name: string })[]
  holders: { total: number; avg: number | null }
  day_flows: { ticker: string; flow: number | null }[]
}

export interface AlertItem {
  id: string
  type: string
  severity: "info" | "warning" | "high"
  ticker?: string
  title: string
  detail: string
  date: string
}

export interface Signal {
  ticker: string
  action: string
  confidence: string
  reasons: string[]
}

export interface Rotation {
  date: string
  generated_at: string
  benchmarks: { estr: number | null; sofr: number | null; tbill: number; src: string }
  rows: { ticker: string; bucket: string; yield: number; hedged: number | null }[]
  best_eur: { ticker: string; bucket: string; yield: number; hedged: number | null } | null
  best_usd: { ticker: string; bucket: string; yield: number; hedged: number | null } | null
  signal: "ROTATE_EUR" | "ROTATE_USD" | "HOLD" | "N/A"
  gap_pt: number | null
  note: string
}

export interface Strategy {
  date: string
  generated_at: string
  benchmarks: { estr: number | null; sofr: number | null; tbill: number }
  rows: {
    ticker: string
    bucket: string
    yield: number
    tvl: number
    holders: number
    coverage: number | null
    collateral: number
    carry: number | null
  }[]
  ranking: string[]
  pairs: { a: string; b: string; spread_pt: number; long: string; short: string; note: string }[]
  top: string | null
  signal: string
  note: string
}

export interface Verification {
  date: string
  verified_at: string
  summary: Record<string, number>
  consensus?: Record<string, number>
  recon?: {
    ticker: string
    reported: number
    verified: number
    delta_pct: number
    reconciled: boolean
    note: string
  }[]
  funds: {
    ticker: string
    slug: string
    supply: number
    verified: number
    coverage: number
    status: string
    note: string
  }[]
}

export interface CryptoData {
  mcap: { usd: number; chg_24h_pct: number }
  volume: { usd: number }
  btc: { usd: number; chg_24h: number }
  eth: { usd: number; chg_24h: number }
  dominance: { btc: number; eth: number }
  movers: { gainers: { sym: string; pct: number }[]; losers: { sym: string; pct: number }[] }
  trending: string[]
}

export interface ChainData {
  defi: { tvl_usd: number; top: { name: string; tvl: number }[]; stables_usd: number; stables_chg_24h_pct: number }
  btc: { tx_24h: number; avg_fee_usd: number; blocks_24h: number }
  eth: { tx_24h: number; blocks_24h: number }
}

export interface ScoreRow {
  ticker: string
  score: number
  yield_p: number
  momentum: number
  flow: number
  stability: number
  confidence: string
}

export interface HitRate {
  n: number
  hits: number
  rate: number | null
}

export interface Overview {
  date: string
  generated_at: string
  market_view: string
  crypto_view: string | null
  chain_view: string | null
  signals: Signal[]
  scores?: ScoreRow[]
  hit_rate?: HitRate | null
  macro: {
    fear_greed: { value: number; label: string }
    btc: { usd: number; chg_24h: number }
    tbill_yield: number
    max_rwa_yield: number
    spread: number
    risk_level: string
  }
  crypto: CryptoData | null
  chain: ChainData | null
  signer: string
  hash: string
  verified: { ok: boolean; hash_ok: boolean; sig_ok: boolean; signer: string } | null
  attestation: {
    attested: boolean
    key: string
    tx: string
    block: number | null
    hash_ok: boolean
    signer_ok: boolean
  } | null
  snapshot: { date: string; fetched_at: string; age_hours: number; lag: string } | null
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`)
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.json() as Promise<T>
}

export const getOverview = () => get<Overview>("/overview")
export const getFunds = () => get<{ funds: FundRow[] }>("/funds")
export const getFund = (slug: string) => get<FundDetail>(`/funds/${slug}`)
export const getFlows = () => get<{ flows: Flow[] }>("/flows")
export const getAnalytics = () => get<Analytics>("/analytics")
export const getAlerts = () => get<{ updated_at: string | null; alerts: AlertItem[] }>("/alerts")
export const getRotation = () => get<Rotation>("/rotation")
export const getStrategy = () => get<Strategy>("/strategy")
export const getVerification = () => get<Verification>("/verification")
