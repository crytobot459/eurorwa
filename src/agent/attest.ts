import { existsSync, mkdirSync } from "node:fs"
import { chmod, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Database } from "bun:sqlite"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { keccak256, toBytes, type Hex } from "viem"

interface Row {
  ticker: string
  slug: string
  tvl: number
  yield: number
  holders: number
}

const dir = join(import.meta.dir, "..", "..", "data")
mkdirSync(dir, { recursive: true })

const keyFile = join(dir, "agent.key")
let pk: Hex
if (existsSync(keyFile)) {
  pk = (await readFile(keyFile, "utf8")).trim() as Hex
} else {
  pk = generatePrivateKey()
  await writeFile(keyFile, pk, { mode: 0o600 })
  await chmod(keyFile, 0o600)
  console.log(`created agent wallet at ${keyFile}`)
}
const acct = privateKeyToAccount(pk)

const db = new Database(join(dir, "rwa.db"))
const date = (db.query("SELECT MAX(date) AS d FROM snapshots").get() as { d: string }).d
const rows = db
  .query(
    `SELECT f.ticker, f.slug, s.tvl, s.yield, s.holders
     FROM snapshots s JOIN funds f ON f.id = s.fund_id
     WHERE s.date = ?
     ORDER BY f.ticker`,
  )
  .all(date) as Row[]

const funds = rows.map((r) => ({
  ticker: r.ticker,
  slug: r.slug,
  tvl: r.tvl,
  yield: r.yield,
  holders: r.holders,
}))
const payload = { date, generated_at: new Date().toISOString(), funds }

const hash = keccak256(toBytes(JSON.stringify(payload)))
const signature = await acct.sign({ hash })

const out = join(dir, "attestations")
mkdirSync(out, { recursive: true })
const att = { date, signer: acct.address, hash, signature, payload }
await writeFile(join(out, `${date}.json`), JSON.stringify(att, null, 2))

console.log(`attested ${date}: ${funds.length} funds`)
console.log(`  signer  ${acct.address}`)
console.log(`  hash    ${hash}`)
console.log(`  file    ${join(out, `${date}.json`)}`)
