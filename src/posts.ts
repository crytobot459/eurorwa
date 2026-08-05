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

const issuer = (f: Fund) => f.issuer.split(" ")[0]

const liTop = byTvl
  .slice(0, 5)
  .map((f) => `• ${f.ticker} (${issuer(f)}) — ${fmt(f.tvl)} · yield ${f.yield > 0 ? f.yield.toFixed(2) + "%" : "n/a"}`)
  .join("\n")

const liYld = byYld
  .slice(0, 5)
  .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
  .join(" · ")

const moversLine = [
  gainer ? `${gainer.ticker} is the 7-day mover (${pct(gainer.chg_7d_pct)})` : "",
  loser ? `while ${loser.ticker} cooled off (${pct(loser.chg_7d_pct)})` : "",
]
  .filter(Boolean)
  .join(", ")

const attFile = join(import.meta.dir, "..", "data", "attestations", `${date}.json`)
let proof = ""
try {
  const att = JSON.parse(readFileSync(attFile, "utf8")) as {
    hash: string
    published?: { tx: string; contract: string }
  }
  if (att.published?.tx) {
    proof = `

Live proof for this snapshot (Sepolia):
• Tx: https://sepolia.etherscan.io/tx/${att.published.tx}
• Contract: ${att.published.contract}
• Hash: ${att.hash.slice(0, 10)}…`
  }
} catch {} // chưa attest/publish — bỏ qua

const linkedin = `${fmt(total)} is sitting in tokenized money market funds — and almost nobody can tell you exactly what's inside them.

I built a live dashboard to change that. Here's what the data says today, and the part I couldn't get from any other data provider.

THE NUMBERS (${date})

${fmt(total)} across 15 EU + US funds:
${liTop}

Top yields today: ${liYld}

WHY THIS MATTERS

Tokenized treasuries are quietly becoming the "risk-free rate on-chain." BlackRock, Circle and Ondo are pulling in billions — paying daily yield, settling 24/7. For corporate treasuries and DeFi alike, this is becoming the default place to park cash.

THE PART I COULDN'T GET ANYWHERE ELSE

No one sits and updates a spreadsheet. My AI agent runs the whole pipeline on its own every 12 hours:

• Scrapes public data across 15 EU + US money market funds
• Computes TVL, yields and 7-day flows
• Hashes every snapshot (keccak-256) and signs it with its own wallet
• Publishes the hash to a smart contract on Sepolia — public, permanent, tamper-proof
• Drafts this very post

I review, hit publish, and open-source the code. Anyone can re-hash the data and verify the on-chain signature. No "trust me bro" dashboards.${proof}

${
  moversLine
    ? `WHAT THE DATA SAYS RIGHT NOW

${moversLine}. The rotation between EUR and USD funds is the story to watch.

`
    : ""
}Live dashboard: ${url}
Open source: https://github.com/crytobot459/eurorwa

What's the one fund you'd add to this list?

#RWA #Tokenization #FixedIncome #DigitalAssets #MoneyMarketFunds`

const out = `# Bài đăng sẵn sàng — ${date}

> Sinh tự động từ snapshot ${date}. Copy-paste từng mục là đăng được.
> 📸 **Đính kèm ảnh (LinkedIn/X):** \`visual.png\` (cùng thư mục, chart 1200x630).

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

const outDir = join(import.meta.dir, "..", "docs", "posts", date)
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, "ready.md")
writeFileSync(outFile, out)
console.log(outFile)
