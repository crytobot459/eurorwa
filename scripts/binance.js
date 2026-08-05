import { createHmac } from "node:crypto"

const base = "https://api.binance.com"
const key = process.env.BINANCE_API_KEY
const secret = process.env.BINANCE_API_SECRET

async function signed(path, params = {}) {
  if (!key || !secret) throw new Error("thiếu BINANCE_API_KEY / BINANCE_API_SECRET")
  const qs = new URLSearchParams({ ...params, timestamp: Date.now() }).toString()
  const sig = createHmac("sha256", secret).update(qs).digest("hex")
  const res = await fetch(`${base}${path}?${qs}&signature=${sig}`, {
    headers: { "X-MBX-APIKEY": key },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`binance ${path}: ${JSON.stringify(json)}`)
  return json
}

export async function depositAddress(coin = "USDT", network = "TRX") {
  return signed("/sapi/v1/capital/deposit/address", { coin, network })
}

export async function depositHistory(coin = "USDT", status = 1) {
  return signed("/sapi/v1/capital/deposit/hisrec", { coin, status })
}

export async function verifyTx(txid, coin = "USDT") {
  const list = await depositHistory(coin)
  const hit = list.find((d) => d.txId === txid)
  return hit ? { found: true, amount: Number(hit.amount), status: hit.status, time: hit.insertTime } : { found: false }
}
