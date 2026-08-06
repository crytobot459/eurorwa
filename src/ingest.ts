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
  chg_30d_pct: number
  chg_90d_pct: number
  yield: number
  yield_30d: number
  yield_chg_30d_pct: number
  yield_chg_90d_pct: number
  holders: number
  holders_7d_pct: number
  holders_30d_pct: number
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
    chg_30d_pct REAL,
    chg_90d_pct REAL,
    yield REAL,
    yield_30d REAL,
    yield_chg_30d_pct REAL,
    yield_chg_90d_pct REAL,
    holders INTEGER,
    holders_7d_pct REAL,
    holders_30d_pct REAL,
    supply REAL,
    PRIMARY KEY (date, fund_id),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
  )
`)
db.run("CREATE INDEX IF NOT EXISTS snapshots_date_idx ON snapshots (date)")
db.run("CREATE INDEX IF NOT EXISTS snapshots_fund_id_idx ON snapshots (fund_id)")

const snapCols = (db.query("PRAGMA table_info(snapshots)").all() as { name: string }[]).map((c) => c.name)
for (const col of [
  "chg_30d_pct",
  "chg_90d_pct",
  "yield_30d",
  "yield_chg_30d_pct",
  "yield_chg_90d_pct",
  "holders_7d_pct",
  "holders_30d_pct",
]) {
  if (!snapCols.includes(col)) db.run(`ALTER TABLE snapshots ADD COLUMN ${col} REAL`)
}

const upsertFund = db.prepare(`
  INSERT INTO funds (slug, ticker, name, issuer, asset_class)
  VALUES (?1, ?2, ?3, ?4, ?5)
  ON CONFLICT (slug) DO UPDATE SET
    ticker = ?2, name = ?3, issuer = ?4, asset_class = ?5
`)
const upsertSnap = db.prepare(`
  INSERT INTO snapshots (date, fund_id, tvl, tvl_7d, chg_7d_pct, chg_30d_pct, chg_90d_pct, yield, yield_30d, yield_chg_30d_pct, yield_chg_90d_pct, holders, holders_7d_pct, holders_30d_pct, supply)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
  ON CONFLICT (date, fund_id) DO UPDATE SET
    tvl = ?3, tvl_7d = ?4, chg_7d_pct = ?5, chg_30d_pct = ?6, chg_90d_pct = ?7, yield = ?8, yield_30d = ?9, yield_chg_30d_pct = ?10, yield_chg_90d_pct = ?11, holders = ?12, holders_7d_pct = ?13, holders_30d_pct = ?14, supply = ?15
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
    upsertSnap.run(
      snap.date,
      fId,
      f.tvl,
      f.tvl_7d,
      f.chg_7d_pct,
      f.chg_30d_pct,
      f.chg_90d_pct,
      f.yield,
      f.yield_30d,
      f.yield_chg_30d_pct,
      f.yield_chg_90d_pct,
      f.holders,
      f.holders_7d_pct,
      f.holders_30d_pct,
      f.supply,
    )
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
