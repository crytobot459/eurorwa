import { latestSnapshot, analyze as computeIndicators } from "./data"
import { fetchNews, analyzeNews } from "./news"
import { analyzeFlow } from "./flow"
import { analyzeMacro } from "./macro"
import { analyzeCrypto, emptyCrypto } from "./crypto"
import { analyzeChain, emptyChain } from "./chain"
import { analyze } from "./analyst"
import { store } from "./store"
import { postSummary } from "./tg"

const snap = latestSnapshot()
const { funds, ranks } = computeIndicators(snap)

console.log(`=== EuroRWA Analyst — ${snap.date} (${funds.length} funds) ===`)

const [items, flow, macro, crypto, chain] = await Promise.allSettled([
  fetchNews(),
  analyzeFlow(snap, funds),
  analyzeMacro(funds),
  analyzeCrypto(),
  analyzeChain(),
])
console.log(`news fetched: ${items.status === "fulfilled" ? items.value.length : "fail"} items`)

const newsSignals = items.status === "fulfilled" ? await analyzeNews(items.value) : []
console.log(`news signals: ${newsSignals.length}`)
newsSignals.forEach((n) => console.log(`  [${n.direction}${n.fund ? " " + n.fund : ""}] ${n.topic}`))

const flowSignals = flow.status === "fulfilled" ? flow.value : []
console.log(`\n=== FLOW (on-chain holders/supply) ===`)
flowSignals.forEach((f) =>
  console.log(`  [${f.direction}] ${f.ticker}: holders 7d ${f.holders_7d_pct.toFixed(1)}% — ${f.note}`),
)

const macroSignal = macro.status === "fulfilled" ? macro.value : null
console.log(`\n=== MACRO ===`)
console.log(`  ${macroSignal?.note ?? "n/a"}`)

const cryptoSignal = crypto.status === "fulfilled" ? crypto.value : emptyCrypto
console.log(`\n=== CRYPTO ===`)
console.log(`  ${cryptoSignal.note}`)

const chainSignal = chain.status === "fulfilled" ? chain.value : emptyChain
console.log(`\n=== ON-CHAIN ===`)
console.log(`  ${chainSignal.note}`)

const report = await analyze(
  snap.date,
  funds,
  ranks,
  newsSignals,
  flowSignals,
  macroSignal ?? {
    fear_greed: { value: 50, label: "n/a" },
    btc: { usd: 0, chg_24h: 0 },
    tbill_yield: 0,
    max_rwa_yield: 0,
    spread: 0,
    risk_level: "neutral",
    note: "macro n/a",
  },
  cryptoSignal,
  chainSignal,
)

console.log(`\n=== MARKET VIEW ===`)
console.log(report.market_view)
console.log(`\n=== CRYPTO VIEW ===`)
console.log(report.crypto_view)
console.log(`\n=== CHAIN VIEW ===`)
console.log(report.chain_view)
console.log(`\n=== SIGNALS ===`)
report.signals.forEach((s) => {
  console.log(`  ${s.action.padEnd(5)} ${s.ticker.padEnd(7)} (${s.confidence})`)
  s.reasons.forEach((r) => console.log(`      - ${r}`))
})

const { file, hash } = await store(report)
console.log(`\ndone: ${file}`)
console.log(`hash: ${hash}`)

await postSummary(report)
