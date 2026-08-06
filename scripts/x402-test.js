import { randomBytes } from "node:crypto"
import { privateKeyToAccount } from "viem/accounts"
import { app } from "../api/_app.js"
import { typedData, requirements, payTo, AMOUNT } from "../api/_x402.js"

const acct = privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`)
process.env.X402_PAYTO = acct.address
process.env.X402_SKIP_BALANCE = "1"

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

const call = async (headers = {}) => app.fetch(new Request("http://localhost/analyst", { method: "POST", headers }))

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64")
const unb64 = (s) => JSON.parse(Buffer.from(s, "base64").toString("utf8"))

const now = Math.floor(Date.now() / 1000)
const auth = (o = {}) => ({
  from: acct.address,
  to: acct.address,
  value: AMOUNT,
  validAfter: String(now - 60),
  validBefore: String(now + 3600),
  nonce: `0x${randomBytes(32).toString("hex")}`,
  ...o,
})

const payloadFor = async (a, acc = requirements(acct.address)) => {
  const signature = await acct.signTypedData(typedData(a))
  return b64({ x402Version: 2, accepted: acc, payload: { signature, authorization: a } })
}

console.log("x402 flow test — payTo", acct.address.slice(0, 10), "…")

const noPay = await call()
assert("no payment → 402", noPay.status === 402)
assert("402 has PAYMENT-REQUIRED header", Boolean(noPay.headers.get("PAYMENT-REQUIRED")))
const pr = unb64(noPay.headers.get("PAYMENT-REQUIRED"))
assert("PAYMENT-REQUIRED is x402 v2", pr.x402Version === 2)
assert("PAYMENT-REQUIRED accepts exact scheme", pr.accepts?.[0]?.scheme === "exact")
assert("PAYMENT-REQUIRED amount $0.05", pr.accepts?.[0]?.amount === AMOUNT)
assert("402 declares bazaar discoverable", pr.extensions?.bazaar?.discoverable === true)

const ok = await call({ "PAYMENT-SIGNATURE": await payloadFor(auth()) })
assert("valid payment → 200", ok.status === 200)
const body = await ok.json()
assert("200 returns report with signals", Array.isArray(body.signals) && body.signals.length > 0)
assert("200 returns report hash", typeof body.hash === "string" && body.hash.startsWith("0x"))
const prResp = unb64(ok.headers.get("PAYMENT-RESPONSE"))
assert("PAYMENT-RESPONSE settlement deferred (no X402_KEY)", prResp.settlement?.status === "deferred")

const expired = await call({ "PAYMENT-SIGNATURE": await payloadFor(auth({ validBefore: String(now - 10) })) })
assert("expired authorization → 402", expired.status === 402)

const wrongAmt = await call({
  "PAYMENT-SIGNATURE": await payloadFor(auth(), { ...requirements(acct.address), amount: "60000" }),
})
assert("amount mismatch → 402", wrongAmt.status === 402)

const wrongPay = await call({
  "PAYMENT-SIGNATURE": await payloadFor(auth({ to: `0x${randomBytes(20).toString("hex")}` })),
})
assert("wrong payTo → 402", wrongPay.status === 402)

const badSig = await call({
  "PAYMENT-SIGNATURE": b64({
    x402Version: 2,
    accepted: requirements(acct.address),
    payload: { signature: "0x" + "0".repeat(130), authorization: auth() },
  }),
})
assert("invalid signature → 402", badSig.status === 402)

const badB64 = await call({ "PAYMENT-SIGNATURE": "!!!not-base64!!!" })
assert("garbage header → 402", badB64.status === 402)

console.log(`\nx402: ${passed} checks passed`)
