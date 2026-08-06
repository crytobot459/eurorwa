export interface ChainTop {
  name: string
  tvl: number
}

export interface ChainSignal {
  defi: { tvl_usd: number; top: ChainTop[]; stables_usd: number; stables_chg_24h_pct: number }
  btc: { tx_24h: number; avg_fee_usd: number; blocks_24h: number }
  eth: { tx_24h: number; blocks_24h: number }
  note: string
}

export const emptyChain: ChainSignal = {
  defi: { tvl_usd: 0, top: [], stables_usd: 0, stables_chg_24h_pct: 0 },
  btc: { tx_24h: 0, avg_fee_usd: 0, blocks_24h: 0 },
  eth: { tx_24h: 0, blocks_24h: 0 },
  note: "on-chain n/a",
}

const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`

export async function analyzeChain(): Promise<ChainSignal> {
  const [llama, stables, btc, eth] = await Promise.allSettled([defiTVL(), stableCoins(), btcStats(), ethStats()])
  const d = llama.status === "fulfilled" ? llama.value : null
  const s = stables.status === "fulfilled" ? stables.value : null
  const b = btc.status === "fulfilled" ? btc.value : null
  const e = eth.status === "fulfilled" ? eth.value : null
  if (!d && !s && !b && !e) return emptyChain
  const defi = d ?? { tvl_usd: 0, top: [] }
  const st = s ?? { usd: 0, chg_24h_pct: 0 }
  const btcS = b ?? { tx_24h: 0, avg_fee_usd: 0, blocks_24h: 0 }
  const ethS = e ?? { tx_24h: 0, blocks_24h: 0 }
  const note = [
    defi.tvl_usd ? `DeFi TVL $${(defi.tvl_usd / 1e9).toFixed(1)}B` : null,
    st.usd ? `stablecoins $${(st.usd / 1e9).toFixed(1)}B (${fmtPct(st.chg_24h_pct)})` : null,
    btcS.avg_fee_usd ? `BTC fee $${btcS.avg_fee_usd.toFixed(2)} (${btcS.tx_24h.toLocaleString("en-US")} tx/24h)` : null,
    ethS.tx_24h ? `ETH ${ethS.tx_24h.toLocaleString("en-US")} tx/24h` : null,
  ]
    .filter(Boolean)
    .join("; ")
  return {
    defi: { ...defi, stables_usd: st.usd, stables_chg_24h_pct: st.chg_24h_pct },
    btc: btcS,
    eth: ethS,
    note: note || "on-chain n/a",
  }
}

async function defiTVL(): Promise<{ tvl_usd: number; top: ChainTop[] }> {
  const res = await fetch("https://api.llama.fi/chains")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const list = (await res.json()) as { name: string; tvl: number | null }[]
  const active = list.filter((c) => c.tvl != null && c.tvl > 0) as { name: string; tvl: number }[]
  const tvl = active.reduce((sum, c) => sum + c.tvl, 0)
  const top = active
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 3)
    .map((c) => ({ name: c.name, tvl: c.tvl }))
  return { tvl_usd: tvl, top }
}

async function stableCoins(): Promise<{ usd: number; chg_24h_pct: number }> {
  const res = await fetch("https://stablecoins.llama.fi/stablecoins")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const j = (await res.json()) as {
    peggedAssets: { circulating: { peggedUSD: number }; circulatingPrevDay: { peggedUSD: number } }[]
  }
  const usd = j.peggedAssets.reduce((sum, a) => sum + (a.circulating?.peggedUSD ?? 0), 0)
  const prev = j.peggedAssets.reduce((sum, a) => sum + (a.circulatingPrevDay?.peggedUSD ?? 0), 0)
  const chg = prev > 0 ? ((usd - prev) / prev) * 100 : 0
  return { usd, chg_24h_pct: chg }
}

async function btcStats(): Promise<{ tx_24h: number; avg_fee_usd: number; blocks_24h: number }> {
  const res = await fetch("https://api.blockchair.com/bitcoin/stats")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const d = (await res.json()).data
  return { tx_24h: d.transactions_24h, avg_fee_usd: d.average_transaction_fee_usd_24h, blocks_24h: d.blocks_24h }
}

async function ethStats(): Promise<{ tx_24h: number; blocks_24h: number }> {
  const res = await fetch("https://api.blockchair.com/ethereum/stats")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const d = (await res.json()).data
  return { tx_24h: d.transactions_24h, blocks_24h: d.blocks_24h }
}
