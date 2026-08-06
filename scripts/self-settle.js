import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { createPublicClient, http, parseAbi } from "viem"
import { base, baseSepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { NETWORK, CHAIN_ID, ASSET, AMOUNT, requirements, cdpJwt, typedData } from "../api/_x402.js"

const PAYTO = process.env.SELF_SETTLE_PAYTO
if (!PAYTO) throw new Error("SELF_SETTLE_PAYTO not set")
if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  throw new Error("CDP_API_KEY_ID / CDP_API_KEY_SECRET not set")
}
const API = process.env.SELF_SETTLE_API ?? "https://rwa-dashboard-gamma.vercel.app"
const CHAIN = CHAIN_ID === 8453 ? base : baseSepolia
const KEY_FILE = new URL(`../data/buyer-${NETWORK}.key`, import.meta.url).pathname
const client = createPublicClient({ chain: CHAIN, transport: http() })

function log(...a) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
}

const buyer = (() => {
  if (existsSync(KEY_FILE)) {
    const saved = JSON.parse(readFileSync(KEY_FILE, "utf8"))
    return { account: privateKeyToAccount(saved.privateKey), key: saved }
  }
  const pk = `0x${randomBytes(32).toString("hex")}`
  const account = privateKeyToAccount(pk)
  const key = { address: account.address, privateKey: pk, network: NETWORK, createdAt: new Date().toISOString() }
  writeFileSync(KEY_FILE, JSON.stringify(key, null, 2), { mode: 0o600 })
  log("buyer key created")
  return { account, key }
})()

const balanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
]

async function usdcBal() {
  const r = await client.readContract({
    address: ASSET,
    abi: balanceAbi,
    functionName: "balanceOf",
    args: [buyer.account.address],
  })
  return r
}

async function ethBal() {
  return client.getBalance({ address: buyer.account.address })
}

async function faucet(token) {
  const url = "https://api.cdp.coinbase.com/platform/v2/evm/faucet"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cdpJwt("POST", "/platform/v2/evm/faucet")}`,
    },
    body: JSON.stringify({ network: "base-sepolia", address: buyer.account.address, token }),
  })
  const j = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`faucet ${token} failed (${res.status}): ${j?.errorMessage ?? JSON.stringify(j)}`)
  log(`faucet ${token} -> tx ${j.transactionHash}`)
  return j.transactionHash
}

async function waitFor(what, fn, min, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const v = await fn()
    if (v >= min) return v
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error(`timeout waiting for ${what}`)
}

console.log("network", NETWORK, "chainId", CHAIN_ID, "asset", ASSET)
console.log("buyer  ", buyer.account.address)
console.log("payTo  ", PAYTO)
console.log("api    ", API)
console.log("")

const [u0, e0] = await Promise.all([usdcBal(), ethBal()])
console.log(`balances  usdc ${Number(u0) / 1e6}  eth ${Number(e0) / 1e18}`)

if (CHAIN_ID === 84532) {
  if (u0 < 1_000_000n) await faucet("usdc")
  if (e0 < 100_000_000_000_000n) await faucet("eth")
  await waitFor("usdc", usdcBal, 50_000n)
  await waitFor("eth", ethBal, 10_000_000_000_000n)
} else {
  if (u0 < BigInt(AMOUNT)) throw new Error("buyer needs USDC on mainnet — fund " + buyer.account.address)
}

const u1 = await usdcBal()
const e1 = await ethBal()
console.log(`funded    usdc ${Number(u1) / 1e6}  eth ${Number(e1) / 1e18}`)

const now = Math.floor(Date.now() / 1000)
const auth = {
  from: buyer.account.address,
  to: PAYTO,
  value: AMOUNT,
  validAfter: String(now - 60),
  validBefore: String(now + 3600),
  nonce: `0x${randomBytes(32).toString("hex")}`,
}
const accepted = requirements(PAYTO)
const signature = await buyer.account.signTypedData(typedData(auth))
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64")
const payment = b64({ x402Version: 2, accepted, payload: { signature, authorization: auth } })

console.log("")
console.log("signing + settling…")
const res = await fetch(`${API}/api/analyst`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": payment },
})
const body = await res.text()
console.log("http", res.status)
console.log("EXTENSION-RESPONSES", res.headers.get("EXTENSION-RESPONSES") ?? res.headers.get("Extension-Responses"))
console.log("PAYMENT-RESPONSE", res.headers.get("PAYMENT-RESPONSE"))
try {
  const j = JSON.parse(body)
  console.log("body.signals", Array.isArray(j.signals) ? j.signals.length : "none", "hash", j.hash ?? "-")
} catch {
  console.log("body", body.slice(0, 400))
}

const ok = res.status === 200
console.log("")
console.log(ok ? "SELF-SETTLE OK" : "SELF-SETTLE FAILED")
process.exit(ok ? 0 : 1)
