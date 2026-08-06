import type { Report, Signal } from "./analyst"

const clip = (s: string) => (s.length > 130 ? s.slice(0, 127) + "…" : s)

export async function postSummary(report: Report): Promise<void> {
  const token = process.env.TG_TOKEN
  const chat = process.env.GROUP_CHAT_ID
  if (!token || !chat) {
    console.log("skip TG summary — thiếu TG_TOKEN/GROUP_CHAT_ID")
    return
  }
  const buys = report.signals.filter((s) => s.action === "BUY")
  const holds = report.signals.filter((s) => s.action === "HOLD")
  const sells = report.signals.filter((s) => s.action === "SELL")
  const line = (s: Signal) => `• ${s.ticker} (${s.confidence}) — ${clip(s.reasons[0] ?? "")}`
  const text = [
    `📊 EuroRWA Analyst — ${report.date}`,
    ``,
    `🌍 ${report.market_view}`,
    ``,
    `🪙 ${clip(report.crypto_view ?? "")}`,
    `⛓️ ${clip(report.chain_view ?? "")}`,
    ``,
    `🟢 BUY (${buys.length}):`,
    ...(buys.length ? buys.map(line) : ["(none)"]),
    ``,
    `⚪ HOLD (${holds.length}):`,
    holds.length ? holds.map((s) => `• ${s.ticker} (${s.confidence})`).join(" · ") : "(none)",
    ``,
    `🔴 SELL (${sells.length}):`,
    ...(sells.length ? sells.map(line) : ["(none)"]),
  ].join("\n")
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  })
  if (!res.ok) console.warn(`TG summary fail: ${await res.text()}`)
  else console.log(`TG summary sent to ${chat}`)
}
