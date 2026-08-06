import { latestSnapshot, type Indicator } from "./data"

export interface MacroSignal {
  fear_greed: { value: number; label: string }
  btc: { usd: number; chg_24h: number }
  tbill_yield: number
  max_rwa_yield: number
  spread: number
  risk_level: "risk_off" | "neutral" | "risk_on"
  note: string
}

export async function analyzeMacro(funds: Indicator[]): Promise<MacroSignal> {
  const [fng, btc] = await Promise.allSettled([fearGreed(), btcPrice()])
  const fearGreedVal = fng.status === "fulfilled" ? fng.value : null
  const btcVal = btc.status === "fulfilled" ? btc.value : null

  const tbill = funds.find((f) => f.ticker === "USTBL")?.yield ?? 4.3
  const maxRwa = funds.reduce((m, f) => Math.max(m, f.yield), 0)
  const spread = maxRwa - tbill

  const fngScore = fearGreedVal?.value ?? 50
  const risk_level = fngScore <= 35 ? "risk_off" : fngScore >= 65 ? "risk_on" : "neutral"
  const note = `${fearGreedVal ? `Fear & Greed ${fngScore} (${fearGreedVal.label})` : "F&G n/a"}; ${
    btcVal
      ? `BTC $${Math.round(btcVal.usd)} (${btcVal.chg_24h > 0 ? "+" : ""}${btcVal.chg_24h.toFixed(2)}%)`
      : "BTC n/a"
  }; top RWA yield ${maxRwa.toFixed(2)}% vs T-bill ~${tbill.toFixed(2)}% → spread +${spread.toFixed(2)}pt`

  return {
    fear_greed: fearGreedVal ?? { value: 50, label: "n/a" },
    btc: btcVal ?? { usd: 0, chg_24h: 0 },
    tbill_yield: tbill,
    max_rwa_yield: maxRwa,
    spread,
    risk_level,
    note,
  }
}

async function fearGreed(): Promise<{ value: number; label: string }> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1")
  if (!res.ok) throw new Error(`http ${res.status}`)
  const json = await res.json()
  const d = json.data?.[0]
  return { value: Number(d.value), label: d.value_classification }
}

async function btcPrice(): Promise<{ usd: number; chg_24h: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
  )
  if (!res.ok) throw new Error(`http ${res.status}`)
  const json = await res.json()
  const b = json.bitcoin
  return { usd: b.usd, chg_24h: b.usd_24h_change }
}
