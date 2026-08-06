import { cdpCredentials, cdpJwt } from "../api/_x402.js"

const CDP = "https://api.cdp.coinbase.com/platform/v2/x402"

if (!cdpCredentials()) {
  console.error(
    "CDP_API_KEY_ID / CDP_API_KEY_SECRET not set — create a free key at portal.cdp.coinbase.com/api-keys/secret",
  )
  process.exit(2)
}

const jwt = cdpJwt("POST", "/platform/v2/x402/verify")
console.log("jwt", jwt.slice(0, 24) + "…")

const res = await fetch(`${CDP}/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ x402Version: 2, paymentPayload: {}, paymentRequirements: {} }),
})
const text = await res.text()
console.log("verify status", res.status)

if (res.status === 401) {
  console.error("AUTH FAILED — JWT rejected")
  process.exit(1)
}
if (res.status === 400) {
  console.log("AUTH OK — JWT accepted, request rejected on schema validation as expected")
  process.exit(0)
}
console.log("unexpected status", text.slice(0, 300))
process.exit(1)
