import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const outDir = join(import.meta.dir, "..", "data", "linkedin")
mkdirSync(outDir, { recursive: true })

const coords: [number, number][] = [
  [162, 100],
  [131, 153.7],
  [69, 153.7],
  [38, 100],
  [69, 46.3],
  [131, 46.3],
]
const nodes = coords
  .map(
    ([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${i === 0 ? 13 : 8}" fill="${i === 0 ? "url(#g1)" : "#22d3ee"}" opacity="${i === 0 ? 1 : 0.85}"/>`,
  )
  .join("")
const spokes = coords
  .slice(1)
  .map(([x, y]) => `<line x1="100" y1="100" x2="${x}" y2="${y}" stroke="rgba(148,163,184,.35)" stroke-width="2"/>`)
  .join("")
const ring = coords
  .slice(1)
  .map(([x, y], i, a) => {
    const [x2, y2] = a[(i + 1) % a.length]
    return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="rgba(52,211,153,.3)" stroke-width="2"/>`
  })
  .join("")

const avatarHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{background:radial-gradient(circle at 50% 38%,#16314d 0%,#0e1a2f 55%,#0b1220 100%);width:400px;height:400px;-webkit-font-smoothing:antialiased}
.wrap{width:400px;height:400px;display:flex;align-items:center;justify-content:center}
.mark{width:216px;height:216px;border-radius:36px;background:linear-gradient(160deg,#13263f,#0e1a2f);border:1px solid rgba(148,163,184,.28);display:flex;align-items:center;justify-content:center;box-shadow:0 0 70px rgba(34,211,238,.14), inset 0 0 40px rgba(52,211,153,.06)}
svg{width:176px;height:176px}
</style></head><body><div class="wrap"><div class="mark">
<svg viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  ${ring}
  ${spokes}
  <circle cx="100" cy="100" r="22" fill="rgba(52,211,153,.08)"/>
  <circle cx="100" cy="100" r="13" fill="url(#g1)"/>
  <circle cx="100" cy="100" r="5" fill="#0b1220"/>
  ${nodes}
</svg>
</div></div></body></html>`

const bannerHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1584px;height:396px;background:linear-gradient(120deg,#0b1220 0%,#0e1a2f 45%,#13263f 78%,#0e2f2a 100%);font-family:"Segoe UI",Arial,sans-serif;color:#e2e8f0;-webkit-font-smoothing:antialiased}
.wrap{width:1584px;height:396px;padding:64px 96px;display:flex;justify-content:space-between;align-items:center}
.left .kicker{font-size:20px;color:#34d399;font-weight:600;letter-spacing:3px}
.left .h{font-size:58px;font-weight:800;color:#fff;margin:12px 0 10px;line-height:1.15}
.left .s{font-size:23px;color:#94a3b8}
.cards{display:flex;gap:18px}
.card{width:168px;height:104px;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(148,163,184,.08);padding:16px;display:flex;flex-direction:column;justify-content:center}
.card .k{font-size:13px;color:#94a3b8}
.card .v{font-size:26px;font-weight:800;color:#34d399;margin-top:4px}
.card .v.cyan{color:#22d3ee}
</style></head><body><div class="wrap">
  <div class="left">
    <div class="kicker">EURO RWA · ONCHAIN DATA PIPELINES</div>
    <div class="h">Verifiable dashboards for tokenized money market funds</div>
    <div class="s">AI agents snapshot 15 EU+US funds every 12 hours, signed on-chain</div>
  </div>
  <div class="cards">
    <div class="card"><div class="k">RWA TVL tracked</div><div class="v">$10.7B</div></div>
    <div class="card"><div class="k">Funds monitored</div><div class="v cyan">15</div></div>
    <div class="card"><div class="k">Attestation</div><div class="v cyan">Sepolia ✓</div></div>
  </div>
</div></body></html>`

const files: [string, string, string, number, number][] = [
  [join(outDir, "avatar.html"), avatarHtml, join(outDir, "avatar.png"), 400, 400],
  [join(outDir, "banner.html"), bannerHtml, join(outDir, "banner.png"), 1584, 396],
]

const chrome = process.env.CHROME || "google-chrome"
for (const [htmlFile, html, pngFile, w, h] of files) {
  writeFileSync(htmlFile, html)
  const profile = join("/tmp", `chrome-headless-${process.pid}-${w}`)
  const res = Bun.spawnSync(
    [
      chrome,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${profile}`,
      `--screenshot=${pngFile}`,
      `--window-size=${w},${h}`,
      "--hide-scrollbars",
      `file://${htmlFile}`,
    ],
    { timeout: 30000 },
  )
  if (res.exitCode !== 0) {
    console.warn(`chrome failed for ${pngFile} (code ${res.exitCode})`)
    process.exit(1)
  }
  console.log(pngFile)
}
