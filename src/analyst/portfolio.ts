import { mkdirSync, readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { readBalance } from "../verify/rpc"
import type { Fund } from "../fetch"

export interface Hold {
  ticker: string
  name: string
  balance: number
  value: number
  yield: number
  est_yield: number
  chains: number
  error?: string
}

export interface Portfolio {
  date: string
  wallet: string
  generated_at: string
  total: number
  net_yield_pct: number
  est_yield: number
  holds: Hold[]
  top: Hold | null
  best_avail: { ticker: string; yield: number } | null
  signal: "ROTATE" | "HOLD" | "EMPTY" | "N/A"
  note: string
}

export async function analyzePortfolio(wallet: string, date: string, funds: Fund[]): Promise<Portfolio> {
  const w = wallet.toLowerCase()
  const rows = await Promise.all(
    funds.map(async (f): Promise<Hold> => {
      const toks = f.tokens ?? []
      const results = await Promise.allSettled(toks.map((t) => readBalance(t.network, t.address, w)))
      let balance = 0
      let chains = 0
      let err: string | undefined
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          if (r.value.balance != null) {
            balance += r.value.balance
            chains++
          } else if (r.value.error) {
            err = r.value.error
          }
        } else {
          err = String((r as PromiseRejectedResult).reason)
        }
      })
      const value = balance
      return {
        ticker: f.ticker,
        name: f.name,
        balance,
        value,
        yield: f.yield,
        est_yield: (value * f.yield) / 100,
        chains,
        ...(err && !balance ? { error: err } : {}),
      }
    }),
  )
  const holds = rows.filter((h) => h.balance > 0).sort((a, b) => b.value - a.value)
  const total = holds.reduce((a, h) => a + h.value, 0)
  const est = holds.reduce((a, h) => a + h.est_yield, 0)
  const net = total > 0 ? (est / total) * 100 : 0
  const paying = funds.filter((f) => f.yield > 0).sort((a, b) => b.yield - a.yield)
  const best_avail = paying[0] ? { ticker: paying[0].ticker, yield: paying[0].yield } : null

  let signal: Portfolio["signal"] = "EMPTY"
  let note = "wallet holds no tracked fund tokens"
  if (total > 0 && best_avail) {
    const gap = best_avail.yield - net
    if (gap >= 0.5) {
      signal = "ROTATE"
      note = `net yield ${net.toFixed(2)}% — moving to ${best_avail.ticker} (${best_avail.yield.toFixed(2)}%) adds ${gap.toFixed(2)}pt`
    } else {
      signal = "HOLD"
      note = `net yield ${net.toFixed(2)}% within ${gap.toFixed(2)}pt of best available (${best_avail.ticker} ${best_avail.yield.toFixed(2)}%)`
    }
  } else if (total > 0) {
    signal = "N/A"
    note = "no benchmark yield available"
  }
  return {
    date,
    wallet: w,
    generated_at: new Date().toISOString(),
    total,
    net_yield_pct: net,
    est_yield: est,
    holds,
    top: holds[0] ?? null,
    best_avail,
    signal,
    note,
  }
}

async function main() {
  const wallet = process.argv[2] ?? process.env.PORTFOLIO_WALLET
  if (!wallet) {
    console.error("usage: bun run src/analyst/portfolio.ts 0x<wallet>")
    process.exit(1)
  }
  const data = join(import.meta.dir, "..", "..", "data")
  const snapDir = join(data, "snapshots")
  const files = readdirSync(snapDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const file = files.at(-1)
  if (!file) {
    console.error("no snapshot yet — run bun run fetch first")
    process.exit(1)
  }
  const snap = JSON.parse(await Bun.file(join(snapDir, file)).text()) as { date: string; funds: Fund[] }
  const p = await analyzePortfolio(wallet, snap.date, snap.funds)

  mkdirSync(join(data, "portfolio"), { recursive: true })
  const out = join(data, "portfolio", `${snap.date}-${wallet.slice(0, 10).toLowerCase()}.json`)
  await writeFile(out, JSON.stringify(p, null, 2))

  console.log(`=== EuroRWA Portfolio — ${snap.date} · ${wallet.slice(0, 6)}…${wallet.slice(-4)} ===`)
  if (!p.holds.length) {
    console.log("no tracked fund tokens found in this wallet")
  } else {
    console.table(
      p.holds.map((h) => ({
        ticker: h.ticker,
        value: h.value.toFixed(2),
        yield: h.yield.toFixed(2),
        est: h.est_yield.toFixed(2),
        chains: h.chains,
      })),
    )
  }
  console.log(`total $${p.total.toFixed(2)} · net yield ${p.net_yield_pct.toFixed(2)}% · signal ${p.signal}`)
  console.log(`  ${p.note}`)
  console.log(`-> ${out}`)
}

if (import.meta.main) await main()
