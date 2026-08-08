import { institutionMetrics } from "../api/_analytics.js"
import { detectAlerts } from "../src/analyst/alerts.ts"
import { app } from "../api/_app.js"
import { computeRotation } from "../src/analyst/rotation.ts"
import { computeStrategy } from "../src/analyst/strategy.ts"
import { classify } from "../src/verify/onchain.ts"
import { computeScores, hitRate } from "../src/analyst/score.ts"
import { analyze as ind } from "../src/analyst/data.ts"

let passed = 0
const assert = (name, cond) => {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    console.error(`  ✗ FAIL ${name}`)
    process.exit(1)
  }
}

const snap = {
  date: "2026-01-01",
  funds: [
    { slug: "a", ticker: "AAA", name: "A", issuer: "IssuerX", tvl: 500, yield: 4, holders: 10, networks: ["Ethereum"] },
    {
      slug: "b",
      ticker: "BBB",
      name: "B",
      issuer: "IssuerX",
      tvl: 300,
      yield: 3,
      holders: 20,
      networks: ["Ethereum", "Base"],
    },
    { slug: "c", ticker: "CCC", name: "C", issuer: "IssuerY", tvl: 200, yield: 2, holders: 30, networks: ["Base"] },
  ],
}

console.log("analytics — institutionMetrics")
const m = institutionMetrics(snap, null)
assert("total TVL = 1000", m.total_tvl === 1000)
assert("fund count = 3", m.fund_count === 3)
assert("top3 = 100%", Math.abs(m.concentration.top3_pct - 100) < 1e-9)
assert("hhi = 0.38", Math.abs(m.concentration.hhi - 0.38) < 1e-9)
assert("median yield = 3", m.breadth.median_yield === 3)
assert("yield spread = 2", m.breadth.spread === 2)
assert("Ethereum share = 80%", Math.abs(m.chains.find((c) => c.name === "Ethereum").share - 80) < 1e-9)
assert("Base share = 50%", Math.abs(m.chains.find((c) => c.name === "Base").share - 50) < 1e-9)
assert("IssuerX share = 80%", Math.abs(m.issuers.find((i) => i.name === "IssuerX").share - 80) < 1e-9)
assert("holders total = 60", m.holders.total === 60)

console.log("alerts — detectAlerts")
const mkRep = (risk, flows = []) => ({
  date: "2026-01-01",
  generated_at: "",
  market_view: "",
  crypto_view: "",
  chain_view: "",
  signals: [],
  news_used: [],
  flow_used: flows,
  macro_used: {
    fear_greed: { value: 20, label: "extreme fear" },
    btc: { usd: 0, chg_24h: 0 },
    tbill_yield: 0,
    max_rwa_yield: 0,
    spread: 1.2,
    risk_level: risk,
    note: "",
  },
  crypto_used: null,
  chain_used: null,
})

const cur = [
  { ticker: "USYC", name: "USYC", tvl: 1000, yield: 4.5, holders: 100, holders_7d_pct: 0 },
  { ticker: "EUTB", name: "EUTB", tvl: 100, yield: 1.0, holders: 50, holders_7d_pct: 0 },
]
const prev = [
  { ticker: "USYC", name: "USYC", tvl: 1000, yield: 4.0, holders: 100, holders_7d_pct: 0 },
  { ticker: "EUTB", name: "EUTB", tvl: 90, yield: 1.0, holders: 50, holders_7d_pct: 0 },
]
const curRep = mkRep("risk_off", [
  { ticker: "USYC", holders: 100, holders_7d_pct: 12, supply_7d_pct: 1, tvl_7d_pct: 0, direction: "inflow", note: "" },
])
const prevRep = mkRep("neutral")

const alerts = detectAlerts(cur, prev, curRep, prevRep, "2026-01-01")
const types = new Set(alerts.map((a) => a.type))
assert("yield breakout detected", types.has("yield-breakout"))
assert("yield cohort detected", types.has("yield-cohort"))
assert("tvl spike detected", types.has("tvl-spike"))
assert("holder surge detected", types.has("holder-surge"))
assert("regime flip detected", types.has("regime-flip"))
const flip = alerts.find((a) => a.type === "regime-flip")
assert("regime flip to risk_off is high severity", flip?.severity === "high")

console.log("endpoints — /analytics and /alerts (live data)")
const an = await app.fetch(new Request("http://localhost/analytics"))
assert("/analytics → 200", an.status === 200)
const anBody = await an.json()
assert("/analytics has total_tvl", typeof anBody.total_tvl === "number" && anBody.total_tvl > 0)
assert("/analytics has concentration", typeof anBody.concentration?.top3_pct === "number")

const al = await app.fetch(new Request("http://localhost/alerts"))
assert("/alerts → 200", al.status === 200)
const alBody = await al.json()
assert("/alerts returns array", Array.isArray(alBody.alerts))

const hb = await app.fetch(new Request("http://localhost/history"))
assert("/history → 200", hb.status === 200)
const hbBody = await hb.json()
assert("/history returns points", Array.isArray(hbBody.points) && hbBody.points.length >= 2)
const h0 = hbBody.points.at(-1)
assert(
  "/history point has total_tvl + median_yield + flow",
  typeof h0?.total_tvl === "number" && h0.total_tvl > 0 && typeof h0.median_yield === "number" && "flow" in h0,
)

console.log("rotation — computeRotation")
const rotFunds = [
  { ticker: "eurSAFO", yield: 3.0, tvl: 100, holders: 10 },
  { ticker: "EUTBL", yield: 2.0, tvl: 100, holders: 10 },
  { ticker: "USYC", yield: 3.5, tvl: 100, holders: 10 },
  { ticker: "UKTBL", yield: 4.0, tvl: 100, holders: 10 },
]
const rot = computeRotation("2026-01-01", rotFunds, 2.0, 3.5, "ecb+fred")
assert(
  "best hedged EUR = eurSAFO 4.5",
  rot.best_eur?.ticker === "eurSAFO" && Math.abs(rot.best_eur.hedged - 4.5) < 1e-9,
)
assert("best USD = USYC 3.5", rot.best_usd?.ticker === "USYC" && Math.abs(rot.best_usd.yield - 3.5) < 1e-9)
assert("gap = 1.0", Math.abs(rot.gap_pt - 1.0) < 1e-9)
assert("signal ROTATE_EUR", rot.signal === "ROTATE_EUR")
assert("GBP bucket", rot.rows.find((r) => r.ticker === "UKTBL")?.bucket === "gbp")

console.log("strategy — computeStrategy")
const strat = computeStrategy(
  "2026-01-01",
  rotFunds,
  2.0,
  3.5,
  new Map([
    ["eurSAFO", 1],
    ["USYC", 1],
    ["EUTBL", 0.5],
  ]),
)
assert("top collateral = USYC", strat.top === "USYC")
assert("USYC carry = 0", Math.abs(strat.rows.find((r) => r.ticker === "USYC").carry) < 1e-9)
const pair = strat.pairs.find((p) => p.a === "eurSAFO" && p.b === "SAFO")
assert("SAFO pair skipped (no SAFO data)", pair === undefined)
assert("ranking is sorted", strat.ranking.length === 4)
assert("carry of USYC included", typeof strat.rows.find((r) => r.ticker === "USYC").carry === "number")

console.log("verifier — classify")
assert("full coverage = ok", classify(100, 100, 1, [{}]).status === "ok")
assert("partial coverage = warn", classify(50, 100, 1, [{}]).status === "warn")
assert("over-supply = fail", classify(110, 100, 1, [{}]).status === "fail")
assert("no readable = na", classify(0, 100, 0, []).status === "na")
assert("node mismatch = warn", classify(100, 100, 1, [{ consensus: "mismatch" }]).status === "warn")
assert("node consensus ok = ok", classify(100, 100, 1, [{ consensus: "ok" }]).status === "ok")

console.log("score — computeScores (golden)")
const sc = (ticker, y, ychg, holders, h7, c7) => ({
  ticker,
  yield: y,
  yield_30d: y,
  yield_chg_30d_pct: ychg,
  yield_chg_90d_pct: ychg,
  chg_7d_pct: c7,
  chg_30d_pct: c7,
  chg_90d_pct: c7,
  holders,
  holders_7d_pct: h7,
  holders_30d_pct: h7,
  tvl: 100,
  tvl_7d: 10,
})
const scFunds = [sc("TOP", 5, 20, 1000, 5, 5), sc("MID", 3, 0, 10, 0, 0), sc("BOT", 1, -20, 5, -5, -5)]
const ranks = ind({ date: "2026-01-01", funds: scFunds }).ranks
const a = computeScores(scFunds, ranks)
const b = computeScores(scFunds, ranks)
assert("scores are deterministic", JSON.stringify(a) === JSON.stringify(b))
const top = a.find((s) => s.ticker === "TOP")
const mid = a.find((s) => s.ticker === "MID")
const bot = a.find((s) => s.ticker === "BOT")
assert("top yield score = 40", Math.abs(top.yield_p - 40) < 1e-9)
assert("top score > mid > bot", top.score > mid.score && mid.score > bot.score)
assert("top confidence high", top.confidence === "high")
assert("mid flat trend = medium confidence", mid.confidence === "medium")
const hr = hitRate()
assert("hit-rate shape", typeof hr === "object" && Number.isInteger(hr.n) && Number.isInteger(hr.hits))

console.log("endpoints — verification/rotation/strategy (live data)")
for (const p of ["/verification", "/rotation", "/strategy"]) {
  const r = await app.fetch(new Request(`http://localhost${p}`))
  assert(`${p} → 200`, r.status === 200)
  const b = await r.json()
  assert(`${p} has date`, typeof b.date === "string")
}
const pf = await app.fetch(new Request("http://localhost/portfolio?wallet=0x0000000000000000000000000000000000000000"))
assert("/portfolio → 200", pf.status === 200)
const pfBody = await pf.json()
assert("/portfolio has signal EMPTY", pfBody.signal === "EMPTY")

console.log(`\naxis: ${passed} checks passed`)
