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

function networkSvg(opts: { line?: string; spoke?: string; ring?: string; outer?: string; opacity?: number } = {}) {
  const line = opts.line ?? "rgba(148,163,184,.35)"
  const spoke = opts.spoke ?? "rgba(148,163,184,.35)"
  const ring = opts.ring ?? "rgba(52,211,153,.3)"
  const outer = opts.outer ?? "#22d3ee"
  const ringLines = coords
    .map(([x, y], i) => {
      const [x2, y2] = coords[(i + 1) % 6]
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${ring}" stroke-width="2"/>`
    })
    .join("")
  const spokes = coords
    .slice(1)
    .map(([x, y]) => `<line x1="100" y1="100" x2="${x}" y2="${y}" stroke="${spoke}" stroke-width="2"/>`)
    .join("")
  const nodes = coords
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${i === 0 ? 13 : 8}" fill="${i === 0 ? "url(#g1)" : outer}" opacity="${i === 0 ? 1 : 0.85}"/>`,
    )
    .join("")
  return `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="22" fill="rgba(52,211,153,.08)"/>
  ${ringLines}
  ${spokes}
  <circle cx="100" cy="100" r="13" fill="url(#g1)"/>
  <circle cx="100" cy="100" r="5" fill="#0b1220"/>
  ${nodes}
</svg>`
}

const avatarHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{background:radial-gradient(circle at 50% 38%,#16314d 0%,#0e1a2f 55%,#0b1220 100%);width:400px;height:400px;-webkit-font-smoothing:antialiased}
.wrap{width:400px;height:400px;display:flex;align-items:center;justify-content:center}
.mark{width:216px;height:216px;border-radius:36px;background:linear-gradient(160deg,#13263f,#0e1a2f);border:1px solid rgba(148,163,184,.28);display:flex;align-items:center;justify-content:center;box-shadow:0 0 70px rgba(34,211,238,.14), inset 0 0 40px rgba(52,211,153,.06)}
svg{width:176px;height:176px}
</style></head><body><div class="wrap"><div class="mark">${networkSvg()}</div></div></body></html>`

const bannerHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1584px;height:396px;background:linear-gradient(120deg,#0b1220 0%,#0e1a2f 45%,#13263f 78%,#0e2f2a 100%);font-family:"Segoe UI",Arial,sans-serif;color:#e2e8f0;-webkit-font-smoothing:antialiased;overflow:hidden}
.wrap{width:1584px;height:396px;padding:0 96px;display:flex;align-items:center;justify-content:space-between;position:relative}
.brand{display:flex;align-items:center;gap:36px}
.mark{width:150px;height:150px;border-radius:32px;background:linear-gradient(160deg,#16314d,#0e1a2f);border:1px solid rgba(148,163,184,.3);display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px rgba(34,211,238,.18)}
.mark svg{width:118px;height:118px}
.word .name{font-size:64px;font-weight:800;letter-spacing:1px;color:#fff;line-height:1}
.word .acc{background:linear-gradient(90deg,#34d399,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.word .rule{width:180px;height:3px;border-radius:2px;background:linear-gradient(90deg,#34d399,#22d3ee);margin:16px 0 14px}
.word .tag{font-size:19px;color:#94a3b8;letter-spacing:2px}
.deco{position:absolute;right:-40px;top:-30px;width:520px;height:520px;opacity:.07;transform:rotate(-8deg);pointer-events:none}
.deco svg{width:100%;height:100%}
</style></head><body><div class="wrap">
  <div class="brand">
    <div class="mark">${networkSvg()}</div>
    <div class="word">
      <div class="name">Euro<span class="acc">RWA</span></div>
      <div class="rule"></div>
      <div class="tag">VERIFIABLE DATA · TOKENIZED MONEY MARKET FUNDS</div>
    </div>
  </div>
  <div class="deco">${networkSvg()}</div>
</div></body></html>`

const logoHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{background:transparent;width:900px;height:280px;font-family:"Segoe UI",Arial,sans-serif;color:#e2e8f0;-webkit-font-smoothing:antialiased;overflow:hidden;display:flex;align-items:center;justify-content:center}
.card{display:flex;align-items:center;gap:36px;padding:44px 56px;border-radius:48px;background:linear-gradient(160deg,#16314d,#0b1220);border:1px solid rgba(148,163,184,.28);box-shadow:0 0 60px rgba(34,211,238,.14), inset 0 0 40px rgba(52,211,153,.05)}
.mark{width:168px;height:168px;border-radius:36px;background:linear-gradient(160deg,#13263f,#0e1a2f);border:1px solid rgba(148,163,184,.3);display:flex;align-items:center;justify-content:center}
.mark svg{width:132px;height:132px}
.word .name{font-size:72px;font-weight:800;letter-spacing:1px;color:#fff;line-height:1}
.word .acc{background:linear-gradient(90deg,#34d399,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.word .tag{font-size:17px;color:#7b8ba0;letter-spacing:3px;margin-top:14px}
</style></head><body><div class="card">
  <div class="mark">${networkSvg()}</div>
  <div class="word">
    <div class="name">Euro<span class="acc">RWA</span></div>
    <div class="tag">ONCHAIN DATA · RWA</div>
  </div>
</div></body></html>`

const files: [string, string, string, number, number][] = [
  [join(outDir, "avatar.html"), avatarHtml, join(outDir, "avatar.png"), 400, 400],
  [join(outDir, "banner.html"), bannerHtml, join(outDir, "banner.png"), 1584, 396],
  [join(outDir, "logo.html"), logoHtml, join(outDir, "logo.png"), 900, 280],
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
