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

const liTop = byTvl
  .slice(0, 5)
  .map((f) => `• ${f.ticker} — ${fmt(f.tvl)}${f.yield > 0 ? ` (yield ${f.yield.toFixed(2)}%)` : ""}`)
  .join("\n")

const liYld = byYld
  .slice(0, 5)
  .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
  .join(" · ")

const linkedin = `$10.6 billion is now sitting in tokenized money market funds — and most people still can't tell you what's inside them.

I built a dashboard to fix that. Here's the full story.

THE NUMBERS (${date})

${fmt(total)} across 15 EU + US funds. Where the money is:
${liTop}

Top yields today: ${liYld}

WHY THIS MATTERS

Tokenized MMFs are quietly becoming the "risk-free rate on-chain" — treasury funds like BlackRock's BUIDL and Circle USYC pay daily yield, settle 24/7, and now hold billions. For corporate treasuries and DeFi alike, this is the new default parking spot for cash.

THE PART I COULDN'T GET ANYWHERE ELSE

I wanted numbers I could actually verify. So every snapshot my agent takes is:

1. Hashed (keccak-256) with the full 15-fund payload
2. Signed by the agent wallet
3. Published to a smart contract on Sepolia — public, permanent, tamper-proof

Anyone can re-hash the data and check the on-chain signature. No "trust me bro" dashboards.

${
  gainer
    ? `WHAT THE DATA SAYS RIGHT NOW\n\n${gainer.ticker} is the 7-day mover (+${gainer.chg_7d_pct.toFixed(2)}%)`
    : ""
}${loser ? `, while ${loser.ticker} cooled off (${pct(loser.chg_7d_pct)}).` : ""}

Live dashboard: ${url}
Open source: https://github.com/crytobot459/eurorwa

What's the one fund you'd add to this list?

#RWA #Tokenization #FixedIncome #DigitalAssets #DeFi #MoneyMarketFunds`

const out = `# Bài đăng sẵn sàng — ${date}

> Sinh tự động từ snapshot ${date}. Copy-paste từng mục là đăng được.
> 📸 **Đính kèm ảnh (LinkedIn/X):** \`docs/posts/visual-${date}.png\` (chart 1200x630, chạy \`bun run visual\` để sinh). Có thể chụp thêm screenshot dashboard.

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
