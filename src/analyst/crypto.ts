export interface Mover {
  sym: string
  pct: number
}

export interface CryptoSignal {
  mcap: { usd: number; chg_24h_pct: number }
  volume: { usd: number }
  btc: { usd: number; chg_24h: number }
  eth: { usd: number; chg_24h: number }
  dominance: { btc: number; eth: number }
  movers: { gainers: Mover[]; losers: Mover[] }
  trending: string[]
  note: string
}

export const emptyCrypto: CryptoSignal = {
  mcap: { usd: 0, chg_24h_pct: 0 },
  volume: { usd: 0 },
  btc: { usd: 0, chg_24h: 0 },
  eth: { usd: 0, chg_24h: 0 },
  dominance: { btc: 0, eth: 0 },
  movers: { gainers: [], losers: [] },
  trending: [],
  note: "crypto n/a",
}

const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`

export async function analyzeCrypto(): Promise<CryptoSignal> {
  const [glob, price, mv, tr] = await Promise.allSettled([globalData(), prices(), moverData(), trendingData()])
  const g = glob.status === "fulfilled" ? glob.value : null
  const p = price.status === "fulfilled" ? price.value : null
  const m = mv.status === "fulfilled" ? mv.value : null
  const t = tr.status === "fulfilled" ? tr.value : null
  if (!g && !p && !m && !t) return emptyCrypto
  const mcap = g ?? { usd: 0, chg_24h_pct: 0 }
  const volume = g ? { usd: g.vol } : { usd: 0 }
  const btc = p?.btc ?? { usd: 0, chg_24h: 0 }
  const eth = p?.eth ?? { usd: 0, chg_24h: 0 }
  const dominance = g ? { btc: g.btc, eth: g.eth } : { btc: 0, eth: 0 }
  const movers = m ?? { gainers: [], losers: [] }
  const trending = t ?? []
  const note = [
    mcap.usd ? `total mcap $${(mcap.usd / 1e12).toFixed(2)}T (${fmtPct(mcap.chg_24h_pct)})` : null,
    volume.usd ? `24h vol $${(volume.usd / 1e9).toFixed(1)}B` : null,
    btc.usd ? `BTC $${Math.round(btc.usd)} (${fmtPct(btc.chg_24h)})` : null,
    eth.usd ? `ETH $${Math.round(eth.usd)} (${fmtPct(eth.chg_24h)})` : null,
    dominance.btc ? `BTC dominance ${dominance.btc.toFixed(1)}%` : null,
    movers.gainers.length ? `gainers ${movers.gainers.map((x) => `${x.sym} ${fmtPct(x.pct)}`).join(", ")}` : null,
    movers.losers.length ? `losers ${movers.losers.map((x) => `${x.sym} ${fmtPct(x.pct)}`).join(", ")}` : null,
    trending.length ? `trending ${trending.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("; ")
  return { mcap, volume, btc, eth, dominance, movers, trending, note: note || "crypto n/a" }
}

async function globalData(): Promise<{ usd: number; chg_24h_pct: number; btc: number; eth: number; vol: number }> {
  const res = await fetch("https://api.coingecko.com/api/v3/global")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const d = (await res.json()).data
  return {
    usd: d.total_market_cap.usd,
    chg_24h_pct: d.market_cap_change_percentage_24h_usd,
    btc: d.market_cap_percentage.btc,
    eth: d.market_cap_percentage.eth,
    vol: d.total_volume.usd,
  }
}

async function prices(): Promise<{ btc: { usd: number; chg_24h: number }; eth: { usd: number; chg_24h: number } }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
  )
  if (!res.ok) throw new Error(`http ${res.status}`)
  const j = await res.json()
  return {
    btc: { usd: j.bitcoin.usd, chg_24h: j.bitcoin.usd_24h_change },
    eth: { usd: j.ethereum.usd, chg_24h: j.ethereum.usd_24h_change },
  }
}

const MIN_VOL = 10_000_000

async function moverData(): Promise<{ gainers: Mover[]; losers: Mover[] }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1",
  )
  if (!res.ok) throw new Error(`http ${res.status}`)
  const list = (await res.json()) as {
    symbol: string
    price_change_percentage_24h: number | null
    total_volume: number | null
  }[]
  const rated = list.filter((c) => c.price_change_percentage_24h != null && (c.total_volume ?? 0) >= MIN_VOL) as {
    symbol: string
    price_change_percentage_24h: number
  }[]
  const by = (dir: 1 | -1) =>
    rated
      .sort((a, b) => dir * (b.price_change_percentage_24h - a.price_change_percentage_24h))
      .slice(0, 5)
      .map((c) => ({ sym: c.symbol.toUpperCase(), pct: c.price_change_percentage_24h }))
  return { gainers: by(1), losers: by(-1) }
}

async function trendingData(): Promise<string[]> {
  const res = await fetch("https://api.coingecko.com/api/v3/search/trending")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const j = (await res.json()) as { coins: { item: { symbol: string } }[] }
  return (j.coins ?? []).slice(0, 5).map((c) => c.item.symbol.toUpperCase())
}
