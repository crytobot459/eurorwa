import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, http, getContract, keccak256, toBytes } from "viem"
import { sepolia } from "viem/chains"
import type { Abi, Hex } from "viem"
import type { Report } from "./analyst"

const dir = join(import.meta.dir, "..", "..", "data")
const outDir = join(dir, "analyst")
mkdirSync(outDir, { recursive: true })

export async function store(report: Report): Promise<{ file: string; signer: string; hash: string }> {
  const keyFile = join(dir, "agent.key")
  if (!existsSync(keyFile)) throw new Error("agent.key missing — chạy bun run src/agent/attest.ts trước")
  const pk = readFileSync(keyFile, "utf8").trim() as Hex
  const acct = privateKeyToAccount(pk)

  const file = join(outDir, `${report.date}.json`)
  const hash = keccak256(toBytes(JSON.stringify(report)))
  const signature = await acct.sign({ hash })
  await writeFile(file, JSON.stringify({ ...report, signer: acct.address, hash, signature }, null, 2))
  console.log(`saved report -> ${file}`)
  console.log(`  signer  ${acct.address}`)
  console.log(`  hash    ${hash}`)

  const cf = join(dir, "contract.json")
  if (existsSync(cf)) {
    const { address, abi } = JSON.parse(readFileSync(cf, "utf8")) as { address: `0x${string}`; abi: Abi }
    const acct2 = privateKeyToAccount(pk)
    const client = createPublicClient({ chain: sepolia, transport: http() })
    const wallet = createWalletClient({ account: acct2, chain: sepolia, transport: http() })
    const contract = getContract({ address, abi, client: wallet })
    const dateKey = `${report.date}-analyst`
    try {
      const existing = (await contract.read.getHash([dateKey])) as string
      const zero = "0x0000000000000000000000000000000000000000000000000000000000000000"
      if (existing !== zero) {
        console.log(`đã attest on-chain rồi: ${dateKey}`)
        return { file, signer: acct.address, hash }
      }
      const tx = await contract.write.attest([dateKey, hash, signature])
      const rec = await client.waitForTransactionReceipt({ hash: tx })
      console.log(`attested on-chain: ${dateKey} | tx ${tx} | block ${rec.blockNumber}`)
    } catch (err) {
      console.warn(`publish on-chain fail (${err}) — vẫn lưu local`)
    }
  } else {
    console.warn("chưa có contract.json — bỏ qua publish on-chain (chạy bun run src/agent/deploy.ts)")
  }
  return { file, signer: acct.address, hash }
}
