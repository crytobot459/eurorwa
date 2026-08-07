import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, http, type Abi, type Hex } from "viem"
import { deployContract } from "viem/actions"
import { sepolia } from "viem/chains"
import solc from "solc"

const dir = join(import.meta.dir, "..", "data")
mkdirSync(dir, { recursive: true })

const userPk = process.env.AVATAR_KEY as Hex | undefined
if (!userPk || !/^0x[0-9a-fA-F]{64}$/.test(userPk)) throw new Error("AVATAR_KEY invalid in .env.local")
const user = privateKeyToAccount(userPk)

const keyFile = join(dir, "agent.key")
let deployerPk: Hex
const envPk = process.env.AGENT_PRIVATE_KEY
if (envPk && /^0x[0-9a-fA-F]{64}$/.test(envPk.trim())) deployerPk = envPk.trim() as Hex
else if (existsSync(keyFile)) deployerPk = readFileSync(keyFile, "utf8").trim() as Hex
else throw new Error("agent.key missing")
const deployer = privateKeyToAccount(deployerPk)

const publicClient = createPublicClient({ chain: sepolia, transport: http() })
const walletClient = createWalletClient({ account: deployer, chain: sepolia, transport: http() })

console.log(`user:     ${user.address}`)
console.log(`deployer: ${deployer.address}`)

const userBal = await publicClient.getBalance({ address: user.address })
const depBal = await publicClient.getBalance({ address: deployer.address })
console.log(`user balance:     ${userBal} wei`)
console.log(`deployer balance: ${depBal} wei`)

if (depBal < 5_000_000_000_000_000n) throw new Error(`deployer short on Sepolia ETH (needs ~0.005)`)
if (userBal === 0n) {
  const amt = 10_000_000_000_000_000n
  console.log(`funding user wallet with ${amt} wei (0.01 Sepolia ETH) from deployer...`)
  const tx = await walletClient.sendTransaction({ to: user.address, value: amt })
  await publicClient.waitForTransactionReceipt({ hash: tx })
  console.log(`funded: ${tx}`)
}

const cx = 500
const cy = 500
const rad = 340
const pts = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2
  return [Math.round(cx + rad * Math.cos(a)), Math.round(cy + rad * Math.sin(a))]
})
const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(148,163,184,.35)" stroke-width="10"/>`
const ring = pts
  .map(([x, y], i) => {
    const [x2, y2] = pts[(i + 1) % 6]
    return line(x, y, x2, y2)
  })
  .join("")
const spokes = pts.map(([x, y]) => line(cx, cy, x, y)).join("")
const nodes = pts
  .map(
    ([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${i === 0 ? 40 : 28}" fill="${i === 0 ? "url(#g1)" : "#22d3ee"}" opacity="${i === 0 ? 1 : 0.85}"/>`,
  )
  .join("")

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0%" stop-color="#16314d"/><stop offset="55%" stop-color="#0e1a2f"/><stop offset="100%" stop-color="#0b1220"/></radialGradient>
<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient>
</defs>
<rect width="1000" height="1000" fill="url(#bg)"/>
<rect x="250" y="250" width="500" height="500" rx="90" fill="#13263f" stroke="rgba(148,163,184,.28)" stroke-width="6"/>
<circle cx="${cx}" cy="${cy}" r="110" fill="rgba(52,211,153,.08)"/>
${ring}
${spokes}
<circle cx="${cx}" cy="${cy}" r="65" fill="url(#g1)"/>
<circle cx="${cx}" cy="${cy}" r="26" fill="#0b1220"/>
${nodes}
</svg>`

const imgUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
const meta = JSON.stringify({
  name: "EuroRWA Avatar",
  description:
    "Profile avatar of the EuroRWA on-chain data pipeline — a network mark for data pipelines, signed snapshots and verifiable numbers. Image stored fully on-chain.",
  image: imgUri,
  attributes: [
    { trait_type: "Style", value: "Network Graph" },
    { trait_type: "Theme", value: "EuroRWA" },
    { trait_type: "Chain", value: "Sepolia" },
  ],
})
const uri = `data:application/json;base64,${Buffer.from(meta).toString("base64")}`

const src = readFileSync(join(import.meta.dir, "..", "contracts", "AvatarNFT.sol"), "utf8")
const input = {
  language: "Solidity",
  sources: { "AvatarNFT.sol": { content: src } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
}
const res = JSON.parse(solc.compile(JSON.stringify(input)))
const errs = res.errors as { severity: string; formattedMessage: string }[] | undefined
if (errs?.some((e) => e.severity === "error")) {
  throw new Error(errs.map((e) => e.formattedMessage).join("\n"))
}
const compiled = res.contracts["AvatarNFT.sol"]["AvatarNFT"]
const abi = compiled.abi as Abi
const bytecode = `0x${compiled.evm.bytecode.object}` as Hex

console.log(`deploying AvatarNFT from ${deployer.address}...`)
const hash = await deployContract(walletClient, { abi, bytecode, args: [uri] })
const rec = await publicClient.waitForTransactionReceipt({ hash })
const address = rec.contractAddress
if (!address) throw new Error("deploy failed: no contract address")

console.log(`deployed: ${address} (tx ${hash})`)

const mintTx = await walletClient.writeContract({ address, abi, functionName: "mint", args: [user.address, 1n] })
await publicClient.waitForTransactionReceipt({ hash: mintTx })
console.log(`minted #1 to ${user.address} (tx ${mintTx})`)

const owner = await publicClient.readContract({ address, abi, functionName: "ownerOf", args: [1n] })
console.log(`ownerOf(1) = ${owner}`)

const out = {
  chain: "sepolia",
  contract: address,
  token_id: 1,
  owner: user.address,
  deployer: deployer.address,
  mint_tx: mintTx,
  deploy_tx: hash,
  explorer: `https://sepolia.etherscan.io/token/${address}`,
}
const outFile = join(dir, "linkedin", "nft.json")
writeFileSync(outFile, JSON.stringify(out, null, 2))
console.log(`saved -> ${outFile}`)
