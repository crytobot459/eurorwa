import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { detectAlerts, type Alert } from "../src/analyst/alerts"
import type { Report } from "../src/analyst/analyst"

const root = join(import.meta.dir, "..")
const snapDir = join(root, "data", "snapshots")
const repDir = join(root, "data", "analyst")
const outFile = join(root, "data", "alerts.json")

const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T

const files = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : []

const snaps = files(snapDir).map((f) => readJson<{ date: string; funds: unknown[] }>(join(snapDir, f)))
const reps = files(repDir).map((f) => readJson<Report>(join(repDir, f)))

const curSnap = snaps.at(-1)
const prevSnap = snaps.at(-2)
const curRep = reps.at(-1) ?? null
const prevRep = reps.at(-2) ?? null

if (!curSnap) {
  console.log("chưa có snapshot — skip alerts")
  process.exit(0)
}

const found = detectAlerts(curSnap.funds as never, (prevSnap?.funds ?? []) as never, curRep, prevRep, curSnap.date)

const existing = existsSync(outFile) ? (readJson<{ alerts: Alert[] }>(outFile).alerts ?? []) : []
const known = new Set(existing.map((a) => a.id))
const fresh = found.filter((a) => !known.has(a.id))
const all = [...existing, ...fresh].slice(-60)

await writeFile(outFile, JSON.stringify({ updated_at: new Date().toISOString(), alerts: all }, null, 2))

const posted = fresh.filter((a) => a.severity !== "info")
console.log(`alerts: ${found.length} detected, ${fresh.length} new, ${posted.length} to post`)
found.forEach((a) => console.log(`  [${a.severity}] ${a.title} — ${a.detail}`))

const token = process.env.TG_TOKEN
const chat = process.env.GROUP_CHAT_ID
if (token && chat && posted.length) {
  const text = [
    `⚠️ EuroRWA Alerts — ${curSnap.date}`,
    ...posted.map((a) => `• [${a.severity.toUpperCase()}] ${a.title}\n  ${a.detail}`),
  ].join("\n")
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  })
  if (!res.ok) console.warn(`TG alerts fail: ${await res.text()}`)
  else console.log(`TG alerts sent to ${chat}`)
}
