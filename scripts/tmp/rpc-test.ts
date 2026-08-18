import { createPublicClient, http, formatUnits } from "viem"
const abi = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
]
const client = createPublicClient({ transport: http("https://cloudflare-eth.com", { timeout: 10000 }) })
const addr = "0x136471a34f6ef19fe571effc1ca711fdb8e49f2b"
const sup = await client.readContract({ address: addr, abi, functionName: "totalSupply" })
const dec = await client.readContract({ address: addr, abi, functionName: "decimals" })
console.log("supply wei:", sup.toString())
console.log("decimals:", dec)
console.log("formatted:", formatUnits(sup, dec))
