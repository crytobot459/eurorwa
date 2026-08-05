import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

interface Fund {
  ticker: string
  tvl: number
  yield: number
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
const total = funds.reduce((s, f) => s + f.tvl, 0)
const max = byTvl[0].tvl

const fmt = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${Math.round(n)}`
}

const bars = byTvl
  .slice(0, 8)
  .map(
    (f, i) => `
    <div class="bar-row">
      <div class="bar-label">${f.ticker}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max((f.tvl / max) * 100, 2)}%"></div></div>
      <div class="bar-val">${fmt(f.tvl)}</div>
    </div>`,
  )
  .join("")

const chips = byYld
  .slice(0, 4)
  .map((f) => `<span class="chip">${f.ticker} <b>${f.yield.toFixed(2)}%</b></span>`)
  .join("")

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{background:#0b1220;font-family:"Segoe UI",Arial,sans-serif;color:#e2e8f0;-webkit-font-smoothing:antialiased}
.card{width:1200px;height:630px;padding:52px 56px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(135deg,#0b1220 0%,#0e1a2f 60%,#13263f 100%)}
.top{display:flex;justify-content:space-between;align-items:center}
.logo{font-size:26px;font-weight:800;letter-spacing:1px}
.logo em{color:#34d399;font-style:normal}
.badge{background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.5);color:#34d399;font-size:17px;font-weight:600;padding:8px 18px;border-radius:999px;letter-spacing:.5px}
.hero h1{font-size:58px;font-weight:800;color:#fff;margin:6px 0 4px}
.hero .sub{font-size:22px;color:#94a3b8}
.hero .meta{font-size:17px;color:#64748b;margin-top:10px}
.mid{display:flex;gap:48px}
.bars{flex:2}
.bar-row{display:flex;align-items:center;gap:12px;margin:9px 0}
.bar-label{width:86px;font-size:18px;font-weight:700;color:#cbd5e1;text-align:right}
.bar-track{flex:1;height:26px;background:rgba(148,163,184,.12);border-radius:6px;overflow:hidden}
.bar-fill{height:100%;background:linear-gradient(90deg,#34d399,#22d3ee);border-radius:6px}
.bar-val{width:92px;font-size:17px;font-weight:700;color:#fff}
.side{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px}
.side .title{font-size:19px;font-weight:700;color:#94a3b8}
.chip{background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.25);padding:9px 14px;border-radius:10px;font-size:17px;color:#cbd5e1}
.chip b{color:#fbbf24}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:15px;color:#64748b}
.foot b{color:#94a3b8}
</style></head><body><div class="card">
  <div class="top">
    <div class="logo">EURO<em>RWA</em></div>
    <div class="badge">✓ ONCHAIN-VERIFIED</div>
  </div>
  <div class="hero">
    <h1>${fmt(total)} in Tokenized Money Market Funds</h1>
    <div class="sub">15 EU + US funds · live TVL, APY, holders</div>
    <div class="meta">Snapshot ${date} · every data point hashed + signed on-chain</div>
  </div>
  <div class="mid">
    <div class="bars">${bars}</div>
    <div class="side">
      <div class="title">Top yields today</div>
      ${chips}
    </div>
  </div>
  <div class="foot"><span>${url}</span><span><b>verify:</b> sepolia.etherscan.io</span></div>
</div></body></html>`

const outDir = join(import.meta.dir, "..", "docs", "posts")
const htmlFile = join(outDir, `visual-${date}.html`)
const pngFile = join(outDir, `visual-${date}.png`)
writeFileSync(htmlFile, html)

const chrome = process.env.CHROME || "google-chrome"
const res = Bun.spawnSync([
  chrome,
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--screenshot=${pngFile}`,
  "--window-size=1200,630",
  "--hide-scrollbars",
  `file://${htmlFile}`,
])
if (res.exitCode !== 0) throw new Error(`chrome screenshot failed: ${res.stderr.toString()}`)

console.log(pngFile)
