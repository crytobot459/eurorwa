import { createPrivateKey, randomBytes, sign } from "node:crypto"
import { createPublicClient, createWalletClient, http, verifyTypedData } from "viem"
import { base, baseSepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"

const USDC = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

const CHAINS = { 8453: base, 84532: baseSepolia }

export const NETWORK = process.env.X402_NETWORK ?? "84532"
export const CHAIN_ID = Number(NETWORK)
export const ASSET = USDC[NETWORK] ?? USDC["84532"]
export const AMOUNT = process.env.X402_AMOUNT ?? "50000"

const EIP712_NAME = NETWORK === "84532" ? "USDC" : "USD Coin"

const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
}

export function typedData(auth) {
  return {
    domain: { name: EIP712_NAME, version: "2", chainId: CHAIN_ID, verifyingContract: ASSET },
    types: EIP712_TYPES,
    primaryType: "TransferWithAuthorization",
    message: auth,
  }
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64")
const unb64 = (s) => JSON.parse(Buffer.from(s, "base64").toString("utf8"))

export function merchantKey() {
  const k = process.env.X402_KEY
  return k ? privateKeyToAccount(k) : null
}

export function payTo() {
  const p = process.env.X402_PAYTO
  if (p) return p
  const m = merchantKey()
  return m ? m.address : null
}

export function requirements(pay) {
  return {
    scheme: "exact",
    network: `eip155:${CHAIN_ID}`,
    amount: AMOUNT,
    asset: ASSET,
    payTo: pay,
    maxTimeoutSeconds: 60,
    extra: { name: EIP712_NAME, version: "2" },
  }
}

export function bazaarExtension() {
  return {
    info: {
      input: { type: "http", method: "POST", bodyType: "json", body: {} },
      output: {
        type: "json",
        example: {
          date: "2026-08-06",
          generated_at: "2026-08-06T09:08:40.386Z",
          market_view:
            "Tokenized Real-World Asset treasury yields remain attractive, led by CETES at 4.60% (+0.28pt spread over T-bills), amidst broader market risk-off sentiment.",
          signals: [
            {
              ticker: "USYC",
              action: "SELL",
              confidence: "high",
              reasons: ["Yield of 3.19% lags the USTBL benchmark by -1.13pt."],
            },
            {
              ticker: "BUIDL",
              action: "HOLD",
              confidence: "high",
              reasons: ["Yield of 3.38% trails benchmark USTBL (4.32%) by -0.93pt."],
            },
          ],
          signer: "0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846",
          hash: "0xb7ec98104df6af75f64bd66f42db36d97aa93937cddb0b033854b11278289a80",
          verified: true,
        },
      },
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            type: { type: "string", const: "http" },
            method: { type: "string", enum: ["POST", "PUT", "PATCH"] },
            bodyType: { type: "string", enum: ["json", "form-data", "text"] },
            body: { type: "object" },
          },
          required: ["type", "method", "bodyType", "body"],
          additionalProperties: false,
        },
        output: {
          type: "object",
          properties: { type: { type: "string" } },
          required: ["type"],
        },
      },
      required: ["input"],
    },
  }
}

export function paymentRequired(c, resource, error) {
  const pay = payTo()
  if (!pay) return c.json({ ok: false, error: "x402 not configured — set X402_PAYTO or X402_KEY" }, 503)
  const body = {
    x402Version: 2,
    error: error ?? "Payment required",
    resource,
    accepts: [requirements(pay)],
    extensions: { bazaar: bazaarExtension() },
  }
  c.header("PAYMENT-REQUIRED", b64(body))
  c.header("X-Payment-Required", "true")
  c.header("X-Payment-Network", CHAIN_ID === 8453 ? "base" : "base-sepolia")
  c.header("X-Payment-Amount", AMOUNT)
  c.header("X-Payment-Currency", "USDC")
  c.header("X-Payment-Address", pay)
  return c.json(
    {
      ok: false,
      error: body.error,
      amount_usd: Number(AMOUNT) / 1e6,
      pay_to: pay,
      network: body.accepts[0].network,
      asset: ASSET,
    },
    402,
  )
}

function nowSec() {
  return Math.floor(Date.now() / 1000)
}

const balanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
]

async function usdcBalance(addr) {
  try {
    const client = createPublicClient({ chain: CHAINS[CHAIN_ID], transport: http() })
    return await client.readContract({ address: ASSET, abi: balanceAbi, functionName: "balanceOf", args: [addr] })
  } catch {
    return null
  }
}

export async function verifyPayment(raw) {
  const pay = payTo()
  if (!pay) return { ok: false, reason: "x402 not configured — set X402_PAYTO or X402_KEY" }
  let payload
  try {
    payload = unb64(raw)
  } catch {
    return { ok: false, reason: "bad PAYMENT-SIGNATURE encoding" }
  }
  const auth = payload?.payload?.authorization
  const acc = payload?.accepted
  if (payload?.x402Version !== 2) return { ok: false, reason: "unsupported x402Version" }
  if (!auth || !payload?.payload?.signature) return { ok: false, reason: "missing authorization or signature" }
  if (!acc) return { ok: false, reason: "missing accepted requirements" }
  if (acc.network !== `eip155:${CHAIN_ID}`) return { ok: false, reason: `network mismatch (${acc.network})` }
  if ((acc.asset ?? "").toLowerCase() !== ASSET.toLowerCase()) return { ok: false, reason: "asset mismatch" }
  if (acc.amount !== AMOUNT) return { ok: false, reason: "amount mismatch" }
  if ((acc.payTo ?? "").toLowerCase() !== pay.toLowerCase()) return { ok: false, reason: "payTo mismatch" }
  if ((auth.to ?? "").toLowerCase() !== pay.toLowerCase()) return { ok: false, reason: "authorization.to mismatch" }
  if (auth.value !== AMOUNT) return { ok: false, reason: "authorization.value mismatch" }
  const n = nowSec()
  if (Number(auth.validAfter) > n) return { ok: false, reason: "authorization not yet valid" }
  if (Number(auth.validBefore) < n) return { ok: false, reason: "authorization expired" }
  let sigOk = false
  try {
    sigOk = await verifyTypedData({ ...typedData(auth), address: auth.from, signature: payload.payload.signature })
  } catch {
    sigOk = false
  }
  if (!sigOk) return { ok: false, reason: "invalid signature" }
  if (process.env.X402_SKIP_BALANCE === "1") return { ok: true, payload, requirements: acc }
  const bal = await usdcBalance(auth.from)
  if (bal === null) return { ok: false, reason: "balance check failed (rpc)" }
  if (bal < BigInt(AMOUNT)) return { ok: false, reason: "insufficient balance" }
  return { ok: true, payload, requirements: acc }
}

const twaAbi = [
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
]

function splitSig(sig) {
  if (sig.startsWith("{")) {
    const o = JSON.parse(sig)
    return { v: o.v, r: o.r, s: o.s }
  }
  return { v: Number.parseInt(sig.slice(130), 16), r: sig.slice(0, 66), s: "0x" + sig.slice(66, 130) }
}

const CDP_HOST = "api.cdp.coinbase.com"
const CDP_BASE = `https://${CDP_HOST}/platform/v2/x402`

const b64u = (b) => Buffer.from(b).toString("base64url")

export function cdpCredentials() {
  const id = process.env.CDP_API_KEY_ID
  const secret = process.env.CDP_API_KEY_SECRET
  return id && secret ? { id, secret } : null
}

export function cdpJwt(method, path) {
  const cred = cdpCredentials()
  if (!cred) return null
  const raw = Buffer.from(cred.secret, "base64")
  const isEd = raw.length === 64
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: isEd ? "EdDSA" : "ES256", typ: "JWT", kid: cred.id, nonce: randomBytes(16).toString("hex") }
  const claims = {
    sub: cred.id,
    iss: "cdp",
    aud: ["cdp_service"],
    nbf: now - 30,
    exp: now + 120,
    uri: `${method} ${CDP_HOST}${path}`,
  }
  const h = b64u(JSON.stringify(header))
  const p = b64u(JSON.stringify(claims))
  const input = Buffer.from(`${h}.${p}`)
  if (isEd) {
    const key = createPrivateKey({
      key: { kty: "OKP", crv: "Ed25519", d: b64u(raw.subarray(0, 32)), x: b64u(raw.subarray(32)) },
      format: "jwk",
    })
    return `${h}.${p}.${b64u(sign(null, input, key))}`
  }
  const key = createPrivateKey({ key: raw, format: "der", type: "pkcs8" })
  return `${h}.${p}.${b64u(sign("sha256", input, key))}`
}

export function facilitatorSettleBody(payload, resource) {
  const pay = payTo()
  if (!pay) throw new Error("x402 not configured — set X402_PAYTO or X402_KEY")
  const accepted = {
    scheme: "exact",
    network: `eip155:${CHAIN_ID}`,
    asset: ASSET,
    amount: AMOUNT,
    payTo: pay,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
  }
  return {
    x402Version: 2,
    paymentPayload: {
      x402Version: 2,
      resource: { url: resource.url, description: resource.description, mimeType: resource.mimeType },
      accepted,
      payload: payload.payload,
      extensions: { bazaar: bazaarExtension() },
    },
    paymentRequirements: accepted,
  }
}

export async function facilitatorSettle(payload, resource) {
  const body = facilitatorSettleBody(payload, resource)
  const res = await fetch(`${CDP_BASE}/settle`, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cdpJwt("POST", "/platform/v2/x402/settle")}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let j = null
  try {
    j = JSON.parse(text)
  } catch {}
  if (!res.ok) {
    throw new Error(`facilitator settle failed (${res.status}): ${j?.errorMessage ?? j?.error ?? text.slice(0, 300)}`)
  }
  const ext = res.headers.get("EXTENSION-RESPONSES") ?? res.headers.get("Extension-Responses")
  let bazaar = null
  if (ext) {
    try {
      bazaar = JSON.parse(Buffer.from(ext, "base64").toString("utf8"))?.bazaar ?? null
    } catch {}
  }
  return { status: "submitted", txHash: j.transaction, network: j.network, bazaar }
}

async function localSettle(payload) {
  const key = merchantKey()
  if (!key) return { status: "deferred", reason: "X402_KEY not set — settlement skipped" }
  const auth = payload.payload.authorization
  const { v, r, s } = splitSig(payload.payload.signature)
  try {
    const wallet = createWalletClient({ account: key, chain: CHAINS[CHAIN_ID], transport: http() })
    const tx = await wallet.writeContract({
      address: ASSET,
      abi: twaAbi,
      functionName: "transferWithAuthorization",
      args: [
        auth.from,
        auth.to,
        BigInt(auth.value),
        BigInt(auth.validAfter),
        BigInt(auth.validBefore),
        auth.nonce,
        v,
        r,
        s,
      ],
    })
    return { status: "submitted", txHash: tx }
  } catch (err) {
    return { status: "failed", error: String(err) }
  }
}

export async function settlePayment(payload, resource) {
  if (!cdpCredentials()) return localSettle(payload)
  try {
    return await facilitatorSettle(payload, resource)
  } catch (err) {
    const msg = String(err)
    const fatal = /4\d\d|insufficient|duplicate|invalid_|kyt|not_allowed/.test(msg)
    if (!fatal) {
      const local = await localSettle(payload)
      if (local.status === "submitted") return local
    }
    return { status: "failed", error: msg }
  }
}

export function paymentResponseHeader(settlement) {
  return b64({ x402Version: 2, settlement })
}
