import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, http, getContract } from "viem"
import { sepolia } from "viem/chains"
import type { Abi } from "viem"

const dir = join(import.meta.dir, "..", "..", "data")
const cf = join(dir, "contract.json")
if (!existsSync(cf)) {
  console.warn("chưa deploy contract — chạy bun run src/agent/deploy.ts trước")
  process.exit(1)
}
const { address, abi } = JSON.parse(readFileSync(cf, "utf8")) as { address: `0x${string}`; abi: Abi }

const keyFile = join(dir, "agent.key")
const pk = readFileSync(keyFile, "utf8").trim() as `0x${string}`
const acct = privateKeyToAccount(pk)

const files = readdirSync(join(dir, "attestations"))
  .filter((f) => f.endsWith(".json"))
  .sort()
const file = files.at(-1)
if (!file) {
  console.warn("chưa có attestation")
  process.exit(1)
}
const att = JSON.parse(readFileSync(join(dir, "attestations", file), "utf8"))

const publicClient = createPublicClient({ chain: sepolia, transport: http() })
const walletClient = createWalletClient({ account: acct, chain: sepolia, transport: http() })
const contract = getContract({ address, abi, client: walletClient })

const existing = (await contract.read.getHash([att.date])) as string
if (existing !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
  console.log(`đã attest rồi: ${att.date} -> ${existing}`)
  process.exit(0)
}

console.log(
  `publishing ${att.date} -> ${address} (gas: ${await publicClient.getBalance({ address: acct.address })} wei)`,
)
const hash = await contract.write.attest([att.date, att.hash, att.signature])
const rec = await publicClient.waitForTransactionReceipt({ hash })
console.log(`tx: ${hash} | block ${rec.blockNumber} | https://sepolia.etherscan.io/tx/${hash}`)
