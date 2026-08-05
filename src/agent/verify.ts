import { readdirSync } from "node:fs"
import { join } from "node:path"
import { keccak256, toBytes, recoverAddress } from "viem"

const dir = join(import.meta.dir, "..", "..", "data")
const attDir = join(dir, "attestations")
const files = readdirSync(attDir)
  .filter((f) => f.endsWith(".json"))
  .sort()

const arg = process.argv[2]
const file = arg ? `${arg}.json` : files.at(-1)
if (!file) {
  console.error("no attestation found")
  process.exit(1)
}

const path = join(attDir, file)
if (!(await Bun.file(path).exists())) {
  console.error(`attestation not found: ${path}`)
  process.exit(1)
}
const att = await Bun.file(path).json()
const hash = keccak256(toBytes(JSON.stringify(att.payload)))
const signer = await recoverAddress({ hash: att.hash, signature: att.signature })

if (hash !== att.hash) {
  console.error("HASH MISMATCH — payload tampered")
  process.exit(1)
}
if (signer.toLowerCase() !== att.signer.toLowerCase()) {
  console.error(`SIGNER MISMATCH — recovered ${signer}, expected ${att.signer}`)
  process.exit(1)
}

console.log(`VERIFIED authentic: ${file}`)
console.log(`  date    ${att.date}`)
console.log(`  funds   ${att.payload.funds.length}`)
console.log(`  signer  ${att.signer}`)
console.log(`  hash    ${att.hash}`)
