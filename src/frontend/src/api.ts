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

export interface Signal {
  ticker: string
  action: string
  confidence: string
  reasons: string[]
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

export interface Overview {
  date: string
  generated_at: string
  market_view: string
  crypto_view: string | null
  chain_view: string | null
  signals: Signal[]
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
