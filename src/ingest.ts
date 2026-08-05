import { Database } from "bun:sqlite"
import { mkdirSync, readdirSync } from "node:fs"
import { join } from "node:path"

interface Fund {
  ticker: string
  slug: string
  name: string
  issuer: string
  asset_class: string
  tvl: number
  tvl_7d: number
  chg_7d_pct: number
  yield: number
  holders: number
  supply: number
  networks: string[]
}

interface Snapshot {
  date: string
  fetched_at: string
  source: string
  funds: Fund[]
}

const dir = join(import.meta.dir, "..", "data")
mkdirSync(dir, { recursive: true })
const db = new Database(join(dir, "rwa.db"))

db.run(`
  CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    issuer TEXT,
    asset_class TEXT
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS snapshots (
    date TEXT NOT NULL,
    fund_id INTEGER NOT NULL,
    tvl REAL,
    tvl_7d REAL,
    chg_7d_pct REAL,
    yield REAL,
    holders INTEGER,
    supply REAL,
    PRIMARY KEY (date, fund_id),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
  )
`)
db.run("CREATE INDEX IF NOT EXISTS snapshots_date_idx ON snapshots (date)")
db.run("CREATE INDEX IF NOT EXISTS snapshots_fund_id_idx ON snapshots (fund_id)")

const upsertFund = db.prepare(`
  INSERT INTO funds (slug, ticker, name, issuer, asset_class)
  VALUES (?1, ?2, ?3, ?4, ?5)
  ON CONFLICT (slug) DO UPDATE SET
    ticker = ?2, name = ?3, issuer = ?4, asset_class = ?5
`)
const upsertSnap = db.prepare(`
  INSERT INTO snapshots (date, fund_id, tvl, tvl_7d, chg_7d_pct, yield, holders, supply)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  ON CONFLICT (date, fund_id) DO UPDATE SET
    tvl = ?3, tvl_7d = ?4, chg_7d_pct = ?5, yield = ?6, holders = ?7, supply = ?8
`)

const snapDir = join(dir, "snapshots")
const files = readdirSync(snapDir)
  .filter((f) => f.endsWith(".json"))
  .sort()

let funds = 0
let snaps = 0
for (const file of files) {
  const snap = (await Bun.file(join(snapDir, file)).json()) as Snapshot
  for (const f of snap.funds) {
    upsertFund.run(f.slug, f.ticker, f.name, f.issuer, f.asset_class)
    const fId = (db.query("SELECT id FROM funds WHERE slug = ?").get(f.slug) as { id: number }).id
    upsertSnap.run(snap.date, fId, f.tvl, f.tvl_7d, f.chg_7d_pct, f.yield, f.holders, f.supply)
    snaps++
  }
  funds = snap.funds.length
}

console.log(`ingested ${files.length} snapshot file(s), ${funds} funds, ${snaps} rows`)
console.table(
  db
    .query(
      `SELECT f.ticker, s.date, ROUND(s.tvl/1e6,1) AS tvl_m, s.chg_7d_pct, s.yield, s.holders
       FROM snapshots s JOIN funds f ON f.id = s.fund_id
       ORDER BY s.date DESC, s.tvl DESC`,
    )
    .all(),
)
