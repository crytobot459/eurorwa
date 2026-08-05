import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const urlSite = "https://rwa-dashboard-gamma.vercel.app"
const here = dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()
const snapCands = [
  join(cwd, "data", "snapshots"),
  join(here, "..", "data", "snapshots"),
  join(here, "data", "snapshots"),
]
const attCands = [
  join(cwd, "data", "attestations"),
  join(here, "..", "data", "attestations"),
  join(here, "data", "attestations"),
]
const sdir = snapCands.find((d) => existsSync(d)) ?? snapCands[0]
const adir = attCands.find((d) => existsSync(d)) ?? attCands[0]

function snaps() {
  if (!existsSync(sdir)) return []
  return readdirSync(sdir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(sdir, f), "utf8")))
}

function lastSnap() {
  return snaps().at(-1)
}

function attest(date) {
  const f = join(adir, `${date}.json`)
  if (!existsSync(f)) return null
  return JSON.parse(readFileSync(f, "utf8"))
}

const fmt = (n) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${Math.round(n)}`
}

const pct = (n) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

function help() {
  return `🤖 EuroRWA Assistant

Tôi đọc data tokenized money market funds mỗi 12h và đối chiếu chữ ký on-chain.

Commands:
/today — con số hôm nay
/funds — toàn bộ quỹ
/yields — top yield
/movers — biến động 7 ngày
/proof — bằng chứng on-chain
/suggest <comment> — gợi ý reply cho comment LinkedIn

Gõ thẳng tên quỹ (vd: usyc) hoặc đặt câu hỏi (vd: "top yield?") cũng được.`
}

function today() {
  const s = lastSnap()
  if (!s) return "Chưa có data — chạy fetch trước."
  const { date, funds } = s
  const total = funds.reduce((a, f) => a + f.tvl, 0)
  const byTvl = [...funds].sort((a, b) => b.tvl - a.tvl)
  const byYld = [...funds].sort((a, b) => (b.yield || 0) - (a.yield || 0)).filter((f) => f.yield > 0)
  const top5 = byTvl
    .slice(0, 5)
    .map((f) => `• ${f.ticker} — ${fmt(f.tvl)} · yield ${f.yield > 0 ? f.yield.toFixed(2) + "%" : "n/a"}`)
    .join("\n")
  const ylds = byYld
    .slice(0, 5)
    .map((f) => `${f.ticker} ${f.yield.toFixed(2)}%`)
    .join(" · ")
  const att = attest(date)
  const proof = att?.published?.tx ? `\n🔐 Verify: https://sepolia.etherscan.io/tx/${att.published.tx}` : ""
  return `📊 Tokenized MMFs — ${date}

${fmt(total)} across ${funds.length} EU/US funds:
${top5}

Top yields: ${ylds}
Live: ${urlSite}${proof}`
}

function fundsList() {
  const s = lastSnap()
  if (!s) return "Chưa có data."
  const byTvl = [...s.funds].sort((a, b) => b.tvl - a.tvl)
  const rows = byTvl
    .map(
      (f, i) =>
        `${i + 1}. ${f.ticker} — ${fmt(f.tvl)} · ${f.yield > 0 ? f.yield.toFixed(2) + "%" : "n/a"} · 7d ${pct(f.chg_7d_pct)}`,
    )
    .join("\n")
  return `📈 All funds — ${s.date} (${s.source ?? "rwa.xyz"})

${rows}`
}

function yieldsList() {
  const s = lastSnap()
  if (!s) return "Chưa có data."
  const byYld = [...s.funds].filter((f) => f.yield > 0).sort((a, b) => b.yield - a.yield)
  const rows = byYld.map((f) => `• ${f.ticker} — ${f.yield.toFixed(2)}%`).join("\n")
  return `🏦 Top yields — ${s.date}

${rows}`
}

function moversText() {
  const s = lastSnap()
  if (!s) return "Chưa có data."
  const movers = [...s.funds]
    .filter((f) => f.chg_7d_pct)
    .sort((a, b) => Math.abs(b.chg_7d_pct) - Math.abs(a.chg_7d_pct))
    .slice(0, 5)
  const rows = movers.map((f) => `• ${f.ticker} — ${pct(f.chg_7d_pct)}`).join("\n")
  return `🔄 7-day movers — ${s.date}

${rows}`
}

function proofText() {
  const s = lastSnap()
  if (!s) return "Chưa có data."
  const att = attest(s.date)
  if (!att?.published?.tx) return "Chưa có attestation publish."
  return `🔐 Onchain proof — ${s.date}

Hash: ${att.hash}
Signer: ${att.signer}
Contract: ${att.published.contract}

Tx: https://sepolia.etherscan.io/tx/${att.published.tx}

Ai cũng verify được: hash lại data → so khớp chữ ký trên chuỗi.`
}

function findFund(low) {
  const s = lastSnap()
  if (!s) return null
  return (
    s.funds.find((f) => f.ticker.toLowerCase() === low || (f.name && f.name.toLowerCase().includes(low))) ??
    s.funds.find((f) => f.ticker.toLowerCase().includes(low))
  )
}

function fundText(f) {
  const s = lastSnap()
  return `${f.ticker} (${f.issuer || "?"}) — ${s.date}

TVL: ${fmt(f.tvl)} (7d ${pct(f.chg_7d_pct)})
Yield: ${f.yield > 0 ? f.yield.toFixed(2) + "%" : "n/a"}
Holders: ${(f.holders || 0).toLocaleString()}
Supply: ${(f.supply || 0).toLocaleString()}

Onchain-verified: ${urlSite}`
}

function suggest(comment) {
  const s = lastSnap()
  if (!s) return "Chưa có data — thử lại sau."
  const { date, funds } = s
  const total = funds.reduce((a, f) => a + f.tvl, 0)
  const low = comment.toLowerCase()
  const hit = findFund(low)
  const att = attest(date)
  const txShort = att?.published?.tx ? att.published.tx.slice(0, 10) : null
  const movers = [...funds].filter((f) => f.chg_7d_pct).sort((a, b) => Math.abs(b.chg_7d_pct) - Math.abs(a.chg_7d_pct))
  const gainer = movers.find((f) => f.chg_7d_pct > 0)
  const loser = movers.find((f) => f.chg_7d_pct < 0)
  const dateline = `On today's snapshot (${date}) ${fmt(total)} sits across 15 EU/US tokenized MMFs.`
  const d1 = hit
    ? `Thanks for the comment! ${dateline} ${hit.ticker} specifically: ${fmt(hit.tvl)} TVL at ${hit.yield.toFixed(2)}%. Full breakdown: ${urlSite}`
    : `Thanks for the comment! ${dateline} Full breakdown: ${urlSite}`
  const d2 = gainer
    ? `Great point. FWIW the standout right now is ${gainer.ticker} (${pct(gainer.chg_7d_pct)} over 7d)${
        loser ? ` while ${loser.ticker} cooled off (${pct(loser.chg_7d_pct)})` : ""
      } — the EUR/USD rotation is the story to watch. Live: ${urlSite}`
    : `Great point. Live, refreshable, onchain-verified data: ${urlSite}`
  const d3 = txShort
    ? `Love this take. Adding what I can't get elsewhere: every snapshot is hashed + signed onchain (tx ${txShort}…) so anyone can verify it. What's the one fund you'd add?`
    : `Love this take. We verify every snapshot on-chain — no "trust me bro" dashboards. What's the one fund you'd add? ${urlSite}`
  return `💬 3 mẫu reply (chỉnh theo ý bạn rồi tự đăng):

1) ${d1}

2) ${d2}

3) ${d3}`
}

export function replyFor(text) {
  const t = text.trim()
  const low = t.toLowerCase()
  if (low === "/start" || low === "/help" || low === "/menu") return help()
  if (low === "/today" || low === "/now") return today()
  if (low === "/funds" || low === "/list") return fundsList()
  if (low === "/yields" || low === "/apy") return yieldsList()
  if (low === "/movers" || low === "/flows" || low === "/7d") return moversText()
  if (low === "/proof" || low === "/verify") return proofText()
  if (low.startsWith("/suggest")) return suggest(t.slice("/suggest".length).trim() || "What do you think?")
  const fund = findFund(low)
  if (fund) return fundText(fund)
  if (low.includes("yield") || low.includes("apy")) return yieldsList()
  if (low.includes("tvl") || low.includes("total") || low.includes("sum")) return today()
  if (low.includes("proof") || low.includes("hash") || low.includes("verify") || low.includes("onchain"))
    return proofText()
  if (low.includes("mover") || low.includes("flow") || low.includes("7d")) return moversText()
  if (low.includes("fund") || low.includes("list") || low.includes("all")) return fundsList()
  return help()
}

export async function sendMessage(chatId, text) {
  const token = process.env.TG_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
}

export async function webhook(request) {
  const upd = await request.json()
  const msg = upd.message
  if (!msg?.text) return new Response("ok", { status: 200 })
  const reply = replyFor(msg.text)
  await sendMessage(msg.chat.id, reply)
  return new Response("ok", { status: 200 })
}
