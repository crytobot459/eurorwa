import { generateKeyPairSync, randomBytes, verify } from "node:crypto"
import { privateKeyToAccount } from "viem/accounts"
import { app } from "../api/_app.js"
import { typedData, requirements, payTo, AMOUNT, cdpJwt, facilitatorSettleBody, cdpCredentials } from "../api/_x402.js"

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
assert("402 declares bazaar extension", Boolean(pr.extensions?.bazaar?.info?.input?.type === "http"))
assert("bazaar extension has no discoverable flag", pr.extensions?.bazaar?.discoverable === undefined)
assert(
  "bazaar extension has output.example",
  Boolean(pr.extensions?.bazaar?.info?.output?.example?.signals?.length > 0),
)

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

console.log("")
console.log("CDP facilitator checks —")
assert("cdpCredentials null without env", cdpCredentials() === null)
assert("cdpJwt null without creds", cdpJwt("POST", "/x") === null)

const { privateKey, publicKey } = generateKeyPairSync("ed25519")
const jwk = privateKey.export({ format: "jwk" })
const edSecret = Buffer.concat([Buffer.from(jwk.d, "base64url"), Buffer.from(jwk.x, "base64url")]).toString("base64")
process.env.CDP_API_KEY_ID = "test-key-id"
process.env.CDP_API_KEY_SECRET = edSecret

const jwt = cdpJwt("POST", "/platform/v2/x402/settle")
assert("cdpJwt issued", typeof jwt === "string" && jwt.split(".").length === 3)
const [jh, jp, js] = jwt.split(".")
const jhdr = JSON.parse(Buffer.from(jh, "base64url").toString("utf8"))
const jclm = JSON.parse(Buffer.from(jp, "base64url").toString("utf8"))
assert("jwt header EdDSA + kid", jhdr.alg === "EdDSA" && jhdr.kid === "test-key-id")
assert("jwt issuer cdp", jclm.iss === "cdp" && jclm.aud?.[0] === "cdp_service")
assert("jwt uri bound to settle", jclm.uri === "POST api.cdp.coinbase.com/platform/v2/x402/settle")
assert("jwt signature verifies", verify(null, Buffer.from(`${jh}.${jp}`), publicKey, Buffer.from(js, "base64url")))

const fakePayload = {
  payload: { signature: "0x" + "ab".repeat(65), authorization: { from: acct.address, to: acct.address } },
}
const fakeResource = {
  url: "http://localhost:3000/api/analyst",
  description: "Latest EuroRWA analyst report",
  mimeType: "application/json",
}
const sb = facilitatorSettleBody(fakePayload, fakeResource)
assert("settle body x402Version 2", sb.x402Version === 2 && sb.paymentPayload.x402Version === 2)
assert("settle payload carries resource", sb.paymentPayload.resource.url === fakeResource.url)
assert("settle payload carries signature", sb.paymentPayload.payload.signature === fakePayload.payload.signature)
assert("settle accepted matches requirements", sb.paymentPayload.accepted.payTo === payTo())
assert(
  "settle bazaar extension echoed",
  sb.paymentPayload.extensions?.bazaar?.info?.input?.type === "http" &&
    sb.paymentPayload.extensions?.bazaar?.discoverable === undefined,
)
assert(
  "paymentRequirements aligned",
  sb.paymentRequirements.network === sb.paymentPayload.accepted.network &&
    sb.paymentRequirements.asset === sb.paymentPayload.accepted.asset &&
    sb.paymentRequirements.amount === sb.paymentPayload.accepted.amount,
)

console.log(`\nx402: ${passed} checks passed`)
