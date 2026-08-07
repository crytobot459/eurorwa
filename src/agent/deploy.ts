import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, http } from "viem"
import { deployContract } from "viem/actions"
import { sepolia } from "viem/chains"
import solc from "solc"
import type { Abi, Hex } from "viem"
import { writeFile } from "node:fs/promises"

const dir = join(import.meta.dir, "..", "..", "data")
const keyFile = join(dir, "agent.key")
if (!existsSync(keyFile)) throw new Error("agent.key missing — run attest.ts first to create wallet")
const pk = readFileSync(keyFile, "utf8").trim() as `0x${string}`

const src = readFileSync(join(import.meta.dir, "..", "..", "contracts", "RWAAttestation.sol"), "utf8")
const input = {
  language: "Solidity",
  sources: { "RWAAttestation.sol": { content: src } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
}
const res = JSON.parse(solc.compile(JSON.stringify(input)))
const errs = res.errors as { severity: string; formattedMessage: string }[] | undefined
if (errs?.some((e) => e.severity === "error")) {
  throw new Error(errs.map((e) => e.formattedMessage).join("\n"))
}
const compiled = res.contracts["RWAAttestation.sol"]["RWAAttestation"]
const abi = compiled.abi as Abi
const bytecode = `0x${compiled.evm.bytecode.object}` as Hex

const acct = privateKeyToAccount(pk)
const publicClient = createPublicClient({ chain: sepolia, transport: http() })
const walletClient = createWalletClient({ account: acct, chain: sepolia, transport: http() })

console.log(
  `deploying RWAAttestation from ${acct.address} (${await publicClient.getBalance({ address: acct.address })} wei)`,
)

const hash = await deployContract(walletClient, { abi, bytecode })
const rec = await publicClient.waitForTransactionReceipt({ hash })
const address = rec.contractAddress
if (!address) throw new Error("deploy failed: no contract address in receipt")
console.log(`deployed: ${address} (tx ${hash})`)

const out = { address, abi, deployed_at: new Date().toISOString() }
await writeFile(join(dir, "contract.json"), JSON.stringify(out, null, 2))
console.log(`saved -> data/contract.json`)
