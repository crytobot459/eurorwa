import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const outDir = join(import.meta.dir, "..", "data", "linkedin")
mkdirSync(outDir, { recursive: true })

const avatarHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{background:linear-gradient(135deg,#0b1220 0%,#0e1a2f 55%,#13263f 100%);width:400px;height:400px;-webkit-font-smoothing:antialiased}
.wrap{width:400px;height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;position:relative}
.ring{position:absolute;width:240px;height:240px;border-radius:50%;border:2px dashed rgba(52,211,153,.35);animation:none}
.disc{width:196px;height:196px;border-radius:50%;background:linear-gradient(135deg,#34d399,#22d3ee);display:flex;align-items:center;justify-content:center;box-shadow:0 0 70px rgba(52,211,153,.35)}
.core{width:180px;height:180px;border-radius:50%;background:#0b1220;display:flex;align-items:center;justify-content:center;border:1px solid rgba(148,163,184,.25)}
.mono{font-family:"Segoe UI",Arial,sans-serif;font-size:82px;font-weight:800;background:linear-gradient(90deg,#34d399,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.name{font-family:"Segoe UI",Arial,sans-serif;text-align:center;color:#fff}
.name .n{font-size:24px;font-weight:700;letter-spacing:.5px}
.name .t{font-size:12px;color:#94a3b8;letter-spacing:2.5px;margin-top:6px}
.name .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;margin:0 6px 2px}
</style></head><body><div class="wrap">
  <div class="ring"></div>
  <div class="disc"><div class="core"><span class="mono">CP</span></div></div>
  <div class="name">
    <div class="n">Canh Pham</div>
    <div class="t">BOT DEV<span class="dot"></span>RWA DATA<span class="dot"></span>ONCHAIN</div>
  </div>
</div></body></html>`

const bannerHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1584px;height:396px;background:linear-gradient(120deg,#0b1220 0%,#0e1a2f 45%,#13263f 78%,#0e2f2a 100%);font-family:"Segoe UI",Arial,sans-serif;color:#e2e8f0;-webkit-font-smoothing:antialiased}
.wrap{width:1584px;height:396px;padding:64px 96px;display:flex;justify-content:space-between;align-items:center}
.left .kicker{font-size:20px;color:#34d399;font-weight:600;letter-spacing:3px}
.left .h{font-size:66px;font-weight:800;color:#fff;margin:10px 0 8px}
.left .s{font-size:24px;color:#94a3b8}
.cards{display:flex;gap:18px}
.card{width:168px;height:104px;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(148,163,184,.08);padding:16px;display:flex;flex-direction:column;justify-content:center}
.card .k{font-size:13px;color:#94a3b8}
.card .v{font-size:26px;font-weight:800;color:#34d399;margin-top:4px}
.card .v.cyan{color:#22d3ee}
</style></head><body><div class="wrap">
  <div class="left">
    <div class="kicker">BOT DEVELOPER · RWA · ONCHAIN DATA</div>
    <div class="h">Canh Pham</div>
    <div class="s">Verifiable data pipelines &amp; Telegram bots for tokenized money markets</div>
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
