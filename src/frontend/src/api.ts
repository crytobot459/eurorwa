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
  fund: Omit<FundRow, "tvl" | "chg_7d_pct" | "yield" | "holders" | "date">
  history: Point[]
}

export interface Flow {
  ticker: string
  slug: string
  flow: number | null
  tvl: number
  chg_7d_pct: number
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`)
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.json() as Promise<T>
}

export const getFunds = () => get<{ funds: FundRow[] }>("/funds")
export const getFund = (slug: string) => get<FundDetail>(`/funds/${slug}`)
export const getFlows = () => get<{ flows: Flow[] }>("/flows")
