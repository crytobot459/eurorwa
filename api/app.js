import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { webhook } from "./tgbot.js"

const cwd = process.cwd()
const here = dirname(fileURLToPath(import.meta.url))
const cands = [join(cwd, "data", "snapshots"), join(here, "..", "data", "snapshots"), join(here, "data", "snapshots")]
const dir = cands.find((d) => existsSync(d)) ?? cands[0]
const aCands = [join(cwd, "data", "analyst"), join(here, "..", "data", "analyst"), join(here, "data", "analyst")]
const adir = aCands.find((d) => existsSync(d)) ?? aCands[0]

function snaps() {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
}

function reports() {
  if (!existsSync(adir)) return []
  return readdirSync(adir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(adir, f), "utf8")))
}

export const app = new Hono()
app.use("*", cors())

const bySlug = (slug) => (f) => f.slug === slug

app.get("/tg", (c) => c.text("tg ok"))
app.post("/tg", (c) => webhook(c.req.raw))

app.get("/", (c) => c.json({ ok: true, endpoints: ["/overview", "/funds", "/funds/:slug", "/yields", "/flows"] }))

app.get("/overview", (c) => {
  const rep = reports().at(-1)
  if (!rep) return c.json({ date: null })
  return c.json({
    date: rep.date,
    generated_at: rep.generated_at,
    market_view: rep.market_view,
    signals: rep.signals.map((s) => ({
      ticker: s.ticker,
      action: s.action,
      confidence: s.confidence,
      reasons: s.reasons,
    })),
    macro: rep.macro_used,
    signer: rep.signer,
    hash: rep.hash,
  })
})

app.get("/funds", (c) => {
  const all = snaps()
  const last = all.at(-1)
  if (!last) return c.json({ date: null, funds: [] })
  const funds = [...last.funds]
    .sort((x, y) => y.tvl - x.tvl)
    .map((f) => ({
      slug: f.slug,
      ticker: f.ticker,
      name: f.name,
      issuer: f.issuer,
      asset_class: f.asset_class,
      tvl: f.tvl,
      tvl_7d: f.tvl_7d,
      chg_7d_pct: f.chg_7d_pct,
      yield: f.yield,
      holders: f.holders,
      supply: f.supply,
      date: last.date,
    }))
  return c.json({ date: last.date, funds })
})

app.get("/funds/:slug", (c) => {
  const slug = c.req.param("slug")
  const all = snaps()
  const last = all.at(-1)
  const fund = last?.funds.find(bySlug(slug))
  if (!fund) return c.json({ error: "fund not found" }, 404)
  const history = all.map((s) => {
    const f = s.funds.find(bySlug(slug))
    return {
      date: s.date,
      tvl: f?.tvl ?? null,
      chg_7d_pct: f?.chg_7d_pct ?? null,
      yield: f?.yield ?? null,
      holders: f?.holders ?? null,
      supply: f?.supply ?? null,
    }
  })
  return c.json({
    fund: {
      slug: fund.slug,
      ticker: fund.ticker,
      name: fund.name,
      issuer: fund.issuer,
      asset_class: fund.asset_class,
    },
    history,
  })
})

app.get("/yields", (c) => {
  const all = snaps()
  const last = all.at(-1)
  if (!last) return c.json({ date: null, yields: [] })
  const yields = [...last.funds]
    .sort((x, y) => y.yield - x.yield)
    .map((f) => ({ ticker: f.ticker, slug: f.slug, yield: f.yield, date: last.date }))
  return c.json({ date: last.date, yields })
})

app.get("/flows", (c) => {
  const all = snaps()
  if (all.length < 2) {
    const last = all.at(-1)
    return c.json({ date: last?.date ?? null, prev_date: null, flows: [] })
  }
  const cur = all.at(-1)
  const prev = all.at(-2)
  const pMap = new Map(prev.funds.map((f) => [f.slug, f]))
  const flows = cur.funds.map((f) => {
    const p = pMap.get(f.slug)
    return {
      ticker: f.ticker,
      slug: f.slug,
      flow: p ? f.tvl - p.tvl : null,
      tvl: f.tvl,
      chg_7d_pct: f.chg_7d_pct,
    }
  })
  return c.json({ date: cur.date, prev_date: prev.date, flows })
})
