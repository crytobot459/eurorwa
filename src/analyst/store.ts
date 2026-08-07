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

const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000"

interface Attestation {
  key: string
  hash: Hex
  signer: string
  tx: string
  block: number
  timestamp: number
}

interface C {
  read: { getHash: (args: [string]) => Promise<string> }
  write: { attest: (args: [string, Hex, Hex]) => Promise<`0x${string}`> }
}

export async function store(report: Report): Promise<{ file: string; signer: string; hash: string }> {
  const keyFile = join(dir, "agent.key")
  if (!existsSync(keyFile)) throw new Error("agent.key missing — run bun run src/agent/attest.ts first")
  const pk = readFileSync(keyFile, "utf8").trim() as Hex
  const acct = privateKeyToAccount(pk)

  const file = join(outDir, `${report.date}.json`)
  const hash = keccak256(toBytes(JSON.stringify(report)))
  const signature = await acct.sign({ hash })
  let attestation: Attestation | undefined

  const cf = join(dir, "contract.json")
  if (existsSync(cf)) {
    const { address, abi } = JSON.parse(readFileSync(cf, "utf8")) as { address: `0x${string}`; abi: Abi }
    const client = createPublicClient({ chain: sepolia, transport: http() })
    const wallet = createWalletClient({ account: acct, chain: sepolia, transport: http() })
    const contract = getContract({ address, abi, client: wallet }) as unknown as C
    const key = await freeKey(contract, report.date, hash)
    if (key) {
      try {
        const tx = await contract.write.attest([key, hash, signature])
        const rec = await client.waitForTransactionReceipt({ hash: tx })
        attestation = {
          key,
          hash,
          signer: acct.address,
          tx,
          block: Number(rec.blockNumber),
          timestamp: Math.floor(Date.now() / 1000),
        }
        console.log(`attested on-chain: ${key} | tx ${tx} | block ${rec.blockNumber}`)
      } catch (err) {
        console.warn(`publish on-chain fail (${err}) — keeping local copy`)
      }
    } else {
      console.log(`already attested on-chain with same hash: ${report.date}-analyst`)
    }
  } else {
    console.warn("no contract.json — skipping on-chain publish (run bun run src/agent/deploy.ts)")
  }

  await writeFile(
    file,
    JSON.stringify(
      { ...report, signer: acct.address, hash, signature, ...(attestation ? { attestation } : {}) },
      null,
      2,
    ),
  )
  console.log(`saved report -> ${file}`)
  console.log(`  signer  ${acct.address}`)
  console.log(`  hash    ${hash}`)
  return { file, signer: acct.address, hash }
}

async function freeKey(c: C, date: string, hash: Hex): Promise<string | null> {
  for (let i = 0; i < 10; i++) {
    const key = i === 0 ? `${date}-analyst` : `${date}-analyst-${i + 1}`
    const existing = await c.read.getHash([key])
    if (existing === ZERO) return key
    if (existing.toLowerCase() === hash.toLowerCase()) return null
  }
  return null
}
