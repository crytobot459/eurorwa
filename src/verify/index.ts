import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { verifyFunds } from "./onchain"
import type { Fund } from "../fetch"

const data = join(import.meta.dir, "..", "..", "data")
const snapDir = join(data, "snapshots")
if (!existsSync(snapDir)) {
  console.error("no snapshots dir — run bun run fetch first")
  process.exit(1)
}
const files = readdirSync(snapDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
const file = files.at(-1)
if (!file) {
  console.error("no snapshot yet — run bun run fetch first")
  process.exit(1)
}
const snap = JSON.parse(await Bun.file(join(snapDir, file)).text()) as { date: string; funds: Fund[] }

console.log(`=== EuroRWA On-chain Verifier — ${snap.date} (${snap.funds.length} funds) ===`)
const res = await verifyFunds(snap.date, snap.funds)

mkdirSync(join(data, "verification"), { recursive: true })
const outFile = join(data, "verification", `${snap.date}.json`)
await writeFile(outFile, JSON.stringify(res, null, 2))

console.table(
  res.funds.map((f) => ({
    ticker: f.ticker,
    reported: f.supply.toFixed(0),
    onchain: f.verified.toFixed(0),
    cov: `${(f.coverage * 100).toFixed(0)}%`,
    status: f.status,
  })),
)
console.log(`summary: ${JSON.stringify(res.summary)} -> ${outFile}`)
