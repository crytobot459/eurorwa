import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

interface Fund {
  ticker: string
  name: string
  issuer: string
  tvl: number
  tvl_7d: number
  chg_7d_pct: number
  yield: number
  holders: number
  date: string
}

const url = "https://rwa-dashboard-gamma.vercel.app"
const dir = join(import.meta.dir, "..", "data", "snapshots")
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
const file = files.at(-1)
if (!file) throw new Error("chưa có snapshot — chạy bun run fetch trước")

const snap = JSON.parse(readFileSync(join(dir, file), "utf8")) as { date: string; funds: Fund[] }
const { date, funds } = snap

const byTvl = [...funds].sort((a, b) => b.tvl - a.tvl)
const byYld = [...funds].sort((a, b) => (b.yield || 0) - (a.yield || 0)).filter((f) => f.yield > 0)
const movers = [...funds]
  .filter((f) => f.chg_7d_pct !== 0)
  .sort((a, b) => Math.abs(b.chg_7d_pct) - Math.abs(a.chg_7d_pct))

const total = funds.reduce((s, f) => s + f.tvl, 0)
const top = byTvl[0]
const gainer = movers.find((f) => f.chg_7d_pct > 0)
const loser = movers.find((f) => f.chg_7d_pct < 0)

const fmt = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${Math.round(n)}`
}
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

const rows = byTvl
  .slice(0, 5)
  .map(
    (f) =>
      `| ${f.ticker} | ${fmt(f.tvl)} | ${f.yield > 0 ? f.yield.toFixed(2) + "%" : "—"} | ${f.chg_7d_pct.toFixed(2)}% | ${f.holders} |`,
  )
  .join("\n")

const x = [
  `Tokenized MMFs: ${fmt(total)} across 15 EU/US funds (${date})`,
  `🥇 ${top.ticker} ${fmt(top.tvl)}`,
  `📈 Top yield: ${byYld
    .slice(0, 3)
    .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
    .join(" · ")}`,
  gainer ? `🔄 7d: ${gainer.ticker} ${pct(gainer.chg_7d_pct)}` : "",
  `Onchain-verified daily: ${url}`,
  `#RWA #Tokenization #MoneyMarketFunds`,
]
  .filter(Boolean)
  .join("\n")

const redditTitle = `Tokenized money market funds: ${fmt(total)} across 15 EU/US funds (${date})`
const redditBody = `Live data, refreshed daily (onchain-verified — each snapshot is hashed + signed).

Top 5 by TVL:
| Ticker | TVL | APY | 7d | Holders |
|---|---|---|---|---|
${rows}

Top yields: ${byYld
  .slice(0, 5)
  .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
  .join(", ")}
${
  gainer ? `Biggest 7d mover: ${gainer.ticker} ${pct(gainer.chg_7d_pct)}` : ""
}${loser ? `, ${loser.ticker} ${pct(loser.chg_7d_pct)}` : ""}

Dashboard: ${url}
Repo (attestation code): https://github.com/crytobot459/eurorwa

Happy to add funds I missed — suggestions welcome.`

const linkedin = `Tokenized money market funds just reached ${fmt(total)} in TVL across the 15 EU + US funds I track daily.

Leaders by AUM: ${byTvl
  .slice(0, 5)
  .map((f) => `${f.ticker} (${fmt(f.tvl)})`)
  .join(" · ")}.

Top yields right now: ${byYld
  .slice(0, 4)
  .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
  .join(" · ")}.

${
  gainer ? `The fastest-growing fund over 7 days is ${gainer.ticker} at ${pct(gainer.chg_7d_pct)}.` : ""
}${loser ? ` ${loser.ticker} saw the biggest dip (${pct(loser.chg_7d_pct)}).` : ""}

Every daily snapshot is hashed and signed on-chain, so the numbers are verifiable — no "trust me bro" dashboards.

Live: ${url}
Source: https://github.com/crytobot459/eurorwa

#RWA #Tokenization #FixedIncome #DigitalAssets`

const out = `# Bài đăng sẵn sàng — ${date}

> Sinh tự động từ snapshot ${date}. Copy-paste từng mục là đăng được. Chụp screenshot dashboard kèm theo.

## X (Twitter)

${x}

---

## Reddit (r/tokenization)

**Title:** ${redditTitle}

${redditBody}

---

## LinkedIn

${linkedin}
`

const outDir = join(import.meta.dir, "..", "docs", "posts")
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, `ready-${date}.md`)
writeFileSync(outFile, out)
console.log(outFile)
