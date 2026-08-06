import { readFileSync, existsSync, writeFileSync } from "node:fs"
import { createPublicClient, http, parseAbi, encodeFunctionData } from "viem"
import { baseSepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { randomBytes } from "node:crypto"

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const PAYTO = "0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846"
const KEY_FILE = "/home/win/rwa-dashboard/data/buyer.key"
const client = createPublicClient({ chain: baseSepolia, transport: http() })

let acct
if (existsSync(KEY_FILE) && JSON.parse(readFileSync(KEY_FILE, "utf8")).privateKey) {
  acct = privateKeyToAccount(JSON.parse(readFileSync(KEY_FILE, "utf8")).privateKey)
} else {
  const pk = `0x${randomBytes(32).toString("hex")}`
  acct = privateKeyToAccount(pk)
  writeFileSync(
    KEY_FILE,
    JSON.stringify({ address: acct.address, privateKey: pk, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  )
}
console.log("buyer", acct.address)

const balAbi = ["function balanceOf(address) view returns (uint256)"]
async function usdc() {
  return client.readContract({ address: USDC, abi: parseAbi(balAbi), functionName: "balanceOf", args: [acct.address] })
}
const { cdpJwt, typedData } = await import("../api/_x402.js")

if ((await usdc()) < 1_000_000n) {
  const res = await fetch("https://api.cdp.coinbase.com/platform/v2/evm/faucet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cdpJwt("POST", "/platform/v2/evm/faucet")}`,
    },
    body: JSON.stringify({ network: "base-sepolia", address: acct.address, token: "usdc" }),
  })
  console.log("faucet usdc:", res.status, await res.text())
}
if ((await client.getBalance({ address: acct.address })) < 100_000_000_000_000n) {
  const res = await fetch("https://api.cdp.coinbase.com/platform/v2/evm/faucet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${cdpJwt("POST", "/platform/v2/evm/faucet")}`,
    },
    body: JSON.stringify({ network: "base-sepolia", address: acct.address, token: "eth" }),
  })
  console.log("faucet eth:", res.status, await res.text())
}
for (let i = 0; i < 20; i++) {
  const [u, e] = [await usdc(), await client.getBalance({ address: acct.address })]
  console.log(`  poll ${i}: usdc ${Number(u) / 1e6} eth ${Number(e) / 1e18}`)
  if (u >= 1_000_000n && e >= 100_000_000_000_000n) break
  await new Promise((r) => setTimeout(r, 5000))
}

const twa = [
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
const now = Math.floor(Date.now() / 1000)
const auth = {
  from: acct.address,
  to: PAYTO,
  value: "50000",
  validAfter: String(now - 60),
  validBefore: String(now + 3600),
  nonce: `0x${randomBytes(32).toString("hex")}`,
}
const sig = await acct.signTypedData(typedData(auth))
const v = parseInt(sig.slice(130), 16),
  r = sig.slice(0, 66),
  s = "0x" + sig.slice(66, 130)
try {
  const gas = await client.estimateContractGas({
    address: USDC,
    abi: twa,
    functionName: "transferWithAuthorization",
    account: acct.address,
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
  console.log("estimateContractGas OK:", gas.toString())
} catch (e) {
  console.log("estimate failed:", e.shortMessage ?? e.message)
  try {
    const data = encodeFunctionData({
      abi: twa,
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
    const res = await client.call({ account: acct.address, to: USDC, data })
    console.log("eth_call:", res)
  } catch (e2) {
    console.log("eth_call failed:", e2.shortMessage ?? e2.message)
  }
}
