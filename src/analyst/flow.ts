import { latestSnapshot, type Indicator } from "./data"

export interface FlowSignal {
  ticker: string
  holders: number
  holders_7d_pct: number
  supply_7d_pct: number
  tvl_7d_pct: number
  direction: "inflow" | "outflow" | "flat"
  note: string
}

interface Live {
  holders: number
  holders_7d_pct: number
  supply_7d_pct: number
  tvl_7d_pct: number
}

async function liveFund(slug: string): Promise<Live | null> {
  const res = await fetch(`https://app.rwa.xyz/assets/${slug}`, {
    headers: { "User-Agent": "EuroRWA-analyst/0.1" },
  })
  if (!res.ok) return null
  const html = await res.text()
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  const asset = JSON.parse(m[1]).props?.pageProps?.asset
  if (!asset) return null
  const h = asset.holding_addresses_count ?? {}
  const s = asset.total_supply_token ?? {}
  const t = asset.total_asset_value_dollar ?? {}
  const num = (o: Record<string, unknown>, k: string) => (typeof o[k] === "number" ? (o[k] as number) : 0)
  return {
    holders: num(h, "val"),
    holders_7d_pct: num(h, "chg_7d_pct"),
    supply_7d_pct: num(s, "chg_7d_pct"),
    tvl_7d_pct: num(t, "chg_7d_pct"),
  }
}

export async function analyzeFlow(snap: ReturnType<typeof latestSnapshot>, funds: Indicator[]): Promise<FlowSignal[]> {
  const out: FlowSignal[] = []
  const results = await Promise.allSettled(funds.map((f) => liveFund(f.ticker)))
  results.forEach((r, i) => {
    const f = funds[i]
    const live = r.status === "fulfilled" ? r.value : null
    if (!live) {
      out.push({
        ticker: f.ticker,
        holders: f.holders,
        holders_7d_pct: 0,
        supply_7d_pct: 0,
        tvl_7d_pct: f.chg_7d_pct,
        direction: "flat",
        note: "no live on-chain data — using snapshot",
      })
      return
    }
    const dir =
      live.holders_7d_pct > 1 && live.supply_7d_pct > 0 ? "inflow" : live.holders_7d_pct < -1 ? "outflow" : "flat"
    out.push({
      ticker: f.ticker,
      holders: live.holders,
      holders_7d_pct: live.holders_7d_pct,
      supply_7d_pct: live.supply_7d_pct,
      tvl_7d_pct: live.tvl_7d_pct,
      direction: dir,
      note:
        dir === "inflow"
          ? `holders +${live.holders_7d_pct.toFixed(1)}% (${live.holders}) — institutions entering`
          : dir === "outflow"
            ? `holders ${live.holders_7d_pct.toFixed(1)}% (${live.holders}) — signs of withdrawal`
            : `holders stable (${live.holders})`,
    })
  })
  return out
}
