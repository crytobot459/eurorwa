import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { Database } from "bun:sqlite"
import { createPublicClient, getContract, http } from "viem"
import { sepolia } from "viem/chains"
import type { Abi } from "viem"

const dir = join(import.meta.dir, "..", "..", "data")
const cf = join(dir, "contract.json")
if (!existsSync(cf)) {
  console.log("no contract yet — will attest + publish")
  process.exit(0)
}
const { address, abi } = JSON.parse(readFileSync(cf, "utf8")) as { address: `0x${string}`; abi: Abi }

const db = new Database(join(dir, "rwa.db"))
const date = (db.query("SELECT MAX(date) AS d FROM snapshots").get() as { d: string }).d

const client = createPublicClient({ chain: sepolia, transport: http() })
const contract = getContract({ address, abi, client })
const existing = (await contract.read.getHash([date])) as string
const zero = "0x0000000000000000000000000000000000000000000000000000000000000000"
if (existing !== zero) {
  console.log(`already attested on-chain ${date} -> keeping canonical version`)
  process.exit(1)
}
console.log(`not attested ${date} -> will attest + publish`)
process.exit(0)
