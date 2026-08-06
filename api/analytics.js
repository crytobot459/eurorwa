const EUR = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1", "bC3M"])

function currencyOf(f) {
  const t = f.ticker ?? ""
  const n = f.name ?? ""
  if (EUR.has(t)) return "eur"
  if (/UK|GBP/i.test(t + " " + n)) return "gbp"
  return "usd"
}

export function institutionMetrics(snap, prev) {
  const funds = snap?.funds ?? []
  const total = funds.reduce((a, f) => a + (f.tvl ?? 0), 0)
  const ranked = [...funds].sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
  const share = (n) => (total > 0 ? (ranked.slice(0, n).reduce((a, f) => a + (f.tvl ?? 0), 0) / total) * 100 : 0)
  const hhi = total > 0 ? ranked.reduce((a, f) => a + ((f.tvl ?? 0) / total) ** 2, 0) : 0

  const byCur = new Map()
  for (const f of funds) {
    const cur = currencyOf(f)
    const e = byCur.get(cur) ?? { tvl: 0, count: 0 }
    e.tvl += f.tvl ?? 0
    e.count++
    byCur.set(cur, e)
  }

  const yields = funds
    .map((f) => f.yield ?? 0)
    .filter((y) => y > 0)
    .sort((a, b) => a - b)
  const median = yields.length ? yields[Math.floor(yields.length / 2)] : null

  const chains = new Map()
  for (const f of funds) {
    for (const n of f.networks ?? []) {
      const e = chains.get(n) ?? { tvl: 0, count: 0 }
      e.tvl += f.tvl ?? 0
      e.count++
      chains.set(n, e)
    }
  }
  const chainList = [...chains.entries()]
    .map(([name, v]) => ({ name, tvl: v.tvl, count: v.count, share: total > 0 ? (v.tvl / total) * 100 : 0 }))
    .sort((a, b) => b.tvl - a.tvl)

  const issuers = new Map()
  for (const f of funds) {
    const k = f.issuer ?? f.name ?? "?"
    const e = issuers.get(k) ?? { tvl: 0, count: 0 }
    e.tvl += f.tvl ?? 0
    e.count++
    issuers.set(k, e)
  }
  const issuerList = [...issuers.entries()]
    .map(([name, v]) => ({ name, tvl: v.tvl, count: v.count, share: total > 0 ? (v.tvl / total) * 100 : 0 }))
    .sort((a, b) => b.tvl - a.tvl)

  const holders = funds.map((f) => f.holders ?? 0).filter((h) => h > 0)
  const holderTotal = holders.reduce((a, b) => a + b, 0)

  const prevBy = new Map((prev?.funds ?? []).map((f) => [f.slug, f]))
  const dayFlows = funds.map((f) => {
    const p = prevBy.get(f.slug)
    return { ticker: f.ticker, flow: p ? (f.tvl ?? 0) - (p.tvl ?? 0) : null }
  })

  return {
    date: snap?.date ?? null,
    prev_date: prev?.date ?? null,
    total_tvl: total,
    fund_count: funds.length,
    concentration: { top3_pct: share(3), top5_pct: share(5), top10_pct: share(10), hhi },
    breadth: {
      yield_funds: yields.length,
      median_yield: median,
      max_yield: yields.at(-1) ?? null,
      min_yield: yields[0] ?? null,
      spread: yields.length > 1 ? (yields.at(-1) ?? 0) - (yields[0] ?? 0) : null,
    },
    currency: Object.fromEntries(
      [...byCur.entries()].map(([k, v]) => [
        k,
        { tvl: v.tvl, count: v.count, share: total > 0 ? (v.tvl / total) * 100 : 0 },
      ]),
    ),
    chains: chainList.slice(0, 10),
    issuers: issuerList.slice(0, 5),
    holders: {
      total: holderTotal,
      avg: holders.length ? holderTotal / holders.length : null,
    },
    day_flows: dayFlows.sort((a, b) => (b.flow ?? 0) - (a.flow ?? 0)).slice(0, 10),
  }
}
