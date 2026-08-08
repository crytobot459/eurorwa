import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { webhook } from "./_tgbot.js"
import { verifyReport, verifyAttestation, verifySnapshot, lagOf } from "./_verify.js"
import { institutionMetrics } from "./_analytics.js"
import { paymentRequired, verifyPayment, settlePayment, paymentResponseHeader } from "./_x402.js"

const cwd = process.cwd()
const here = dirname(fileURLToPath(import.meta.url))
const cands = [join(cwd, "data", "snapshots"), join(here, "..", "data", "snapshots"), join(here, "data", "snapshots")]
const dir = cands.find((d) => existsSync(d)) ?? cands[0]
const aCands = [join(cwd, "data", "analyst"), join(here, "..", "data", "analyst"), join(here, "data", "analyst")]
const adir = aCands.find((d) => existsSync(d)) ?? aCands[0]

function subDir(name) {
  const cands = [join(cwd, "data", name), join(here, "..", "data", name), join(here, "data", name)]
  return cands.find((d) => existsSync(d)) ?? cands[0]
}

const vdir = subDir("verification")
const rdir = subDir("rotation")
const sdir = subDir("strategy")
const pdir = subDir("portfolio")

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

function latestJson(dir) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  if (!files.length) return null
  return JSON.parse(readFileSync(join(dir, files.at(-1)), "utf8"))
}

export const app = new Hono()
app.use("*", cors())

const bySlug = (slug) => (f) => f.slug === slug

function consensusCount(funds) {
  const c = { ok: 0, single: 0, mismatch: 0, none: 0 }
  for (const f of funds) for (const ch of f.chains ?? []) c[ch.consensus] = (c[ch.consensus] ?? 0) + 1
  return c
}

app.get("/tg", (c) => c.text("tg ok"))
app.post("/tg", (c) => webhook(c.req.raw))

app.get("/", (c) =>
  c.json({
    ok: true,
    endpoints: [
      "/overview",
      "/funds",
      "/funds/:slug",
      "/yields",
      "/flows",
      "/analytics",
      "/alerts",
      "/verification",
      "/rotation",
      "/strategy",
      "/portfolio?wallet=0x...",
      "/analyst (x402 paid)",
    ],
  }),
)

app.get("/overview", async (c) => {
  const rep = reports().at(-1)
  if (!rep) return c.json({ date: null })
  const snap = snaps().at(-1)
  if (c.req.query("summary") === "true")
    return c.json({
      date: rep.date,
      generated_at: rep.generated_at,
      signals: (rep.signals ?? []).map((s) => ({ ticker: s.ticker, action: s.action, confidence: s.confidence })),
      scores: (rep.scores ?? []).slice(0, 3),
      hit_rate: rep.hit_rate ?? null,
      verified: await verifyReport(rep),
    })
  return c.json({
    date: rep.date,
    generated_at: rep.generated_at,
    market_view: rep.market_view,
    crypto_view: rep.crypto_view ?? null,
    chain_view: rep.chain_view ?? null,
    signals: rep.signals.map((s) => ({
      ticker: s.ticker,
      action: s.action,
      confidence: s.confidence,
      reasons: s.reasons,
    })),
    scores: rep.scores ?? null,
    hit_rate: rep.hit_rate ?? null,
    macro: rep.macro_used,
    crypto: rep.crypto_used ?? null,
    chain: rep.chain_used ?? null,
    signer: rep.signer,
    hash: rep.hash,
    verified: await verifyReport(rep),
    attestation: verifyAttestation(rep),
    snapshot: snap ? { date: snap.date, fetched_at: snap.fetched_at, ...(lagOf(snap.fetched_at) ?? {}) } : null,
  })
})

app.get("/funds", (c) => {
  const all = snaps()
  const last = all.at(-1)
  if (!last) return c.json({ date: null, funds: [] })
  const v = verifySnapshot(last, all.at(-2))
  const vBy = new Map(v.funds.map((f) => [f.slug, f]))
  const ov = latestJson(vdir)
  const ocBy = new Map((ov?.funds ?? []).map((f) => [f.ticker, f]))
  const funds = [...last.funds]
    .sort((x, y) => y.tvl - x.tvl)
    .map((f) => {
      const vf = vBy.get(f.slug)
      const oc = ocBy.get(f.ticker)
      return {
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
        nav: vf?.nav ?? null,
        integrity: vf?.integrity ?? "na",
        checks: vf?.checks ?? null,
        onchain: oc
          ? {
              status: oc.status,
              coverage: oc.coverage,
              verified: oc.verified,
              supply: oc.supply,
            }
          : null,
        date: last.date,
      }
    })
  if (c.req.query("summary") === "true")
    return c.json({
      date: last.date,
      funds: funds.map((f) => ({
        ticker: f.ticker,
        name: f.name,
        yield: f.yield,
        tvl: f.tvl,
        chg_7d_pct: f.chg_7d_pct,
        onchain: f.onchain?.status ?? null,
      })),
    })
  return c.json({
    date: last.date,
    snapshot: { date: last.date, fetched_at: last.fetched_at, ...(lagOf(last.fetched_at) ?? {}) },
    integrity: { checked: v.checked, ok: v.ok, warn: v.warn, fail: v.fail },
    funds,
  })
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

app.get("/analytics", (c) => {
  const all = snaps()
  const last = all.at(-1)
  if (!last) return c.json({ date: null })
  return c.json(institutionMetrics(last, all.at(-2)))
})

const aFile = (() => {
  const cands = [
    join(cwd, "data", "alerts.json"),
    join(here, "..", "data", "alerts.json"),
    join(here, "data", "alerts.json"),
  ]
  return cands.find((f) => existsSync(f)) ?? cands[0]
})()

app.get("/alerts", (c) => {
  if (!existsSync(aFile)) return c.json({ updated_at: null, alerts: [] })
  const j = JSON.parse(readFileSync(aFile, "utf8"))
  return c.json({ updated_at: j.updated_at ?? null, alerts: (j.alerts ?? []).slice(-40).reverse() })
})

app.get("/verification", (c) => {
  const j = latestJson(vdir) ?? { date: null }
  if (c.req.query("summary") === "true" && j.date)
    return c.json({
      date: j.date,
      verified_at: j.verified_at,
      summary: j.summary,
      consensus: consensusCount(j.funds ?? []),
      recon: (j.recon ?? []).filter((r) => !r.reconciled).map((r) => ({ ticker: r.ticker, delta_pct: r.delta_pct })),
      funds: (j.funds ?? []).map((f) => ({ ticker: f.ticker, status: f.status, coverage: f.coverage })),
    })
  return c.json(j)
})

app.get("/rotation", (c) => {
  const j = latestJson(rdir) ?? { date: null }
  if (c.req.query("summary") === "true" && j.date)
    return c.json({
      date: j.date,
      signal: j.signal,
      gap_pt: j.gap_pt,
      best_eur: j.best_eur ? { ticker: j.best_eur.ticker, hedged: j.best_eur.hedged } : null,
      best_usd: j.best_usd ? { ticker: j.best_usd.ticker, yield: j.best_usd.yield } : null,
      note: j.note,
    })
  return c.json(j)
})

app.get("/strategy", (c) => {
  const j = latestJson(sdir) ?? { date: null }
  if (c.req.query("summary") === "true" && j.date)
    return c.json({
      date: j.date,
      signal: j.signal,
      top: j.top,
      ranking: (j.ranking ?? []).slice(0, 5),
      note: j.note,
    })
  return c.json(j)
})

app.get("/portfolio", (c) => {
  const w = c.req.query("wallet")?.toLowerCase()
  if (!w) return c.json({ error: "wallet query required" }, 400)
  if (!existsSync(pdir)) return c.json({ wallet: w, date: null })
  const files = readdirSync(pdir).filter((f) => f.endsWith(".json"))
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(pdir, f), "utf8"))
    if (j.wallet === w) {
      if (c.req.query("summary") === "true" && j.date)
        return c.json({
          wallet: j.wallet,
          date: j.date,
          signal: j.signal,
          total: j.total,
          net_yield_pct: j.net_yield_pct,
          top: j.top ? { ticker: j.top.ticker, value: j.top.value } : null,
          note: j.note,
        })
      return c.json(j)
    }
  }
  return c.json({ wallet: w, date: null })
})

app.post("/analyst", async (c) => {
  const rep = reports().at(-1)
  if (!rep) return c.json({ ok: false, error: "no report yet" }, 503)
  const origin = new URL(c.req.url).origin || "https://rwa-dashboard-gamma.vercel.app"
  const resource = {
    url: `${origin}/api/analyst`,
    description:
      "Latest EuroRWA analyst report — BUY/HOLD/SELL signals, market view, crypto & on-chain briefs, hashed + signed + attested on-chain",
    mimeType: "application/json",
    serviceName: "EuroRWA Analyst",
  }
  const raw = c.req.header("PAYMENT-SIGNATURE") || c.req.header("X-PAYMENT")
  if (!raw) return paymentRequired(c, resource)
  const v = await verifyPayment(raw)
  if (!v.ok) return paymentRequired(c, resource, v.reason)
  const settlement = await settlePayment(v.payload, resource)
  return c.json(rep, 200, { "PAYMENT-RESPONSE": paymentResponseHeader(settlement) })
})
