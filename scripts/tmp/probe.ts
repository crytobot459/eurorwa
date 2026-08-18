import { createPublicClient, http } from "viem"
const urls = {
  "Ethereum#1": "https://eth.drpc.org",
  "Ethereum#2": "https://eth.merkle.io",
  "BNB": "https://bsc-dataseed.binance.org",
  "Base": "https://mainnet.base.org",
  "Arbitrum": "https://arb1.arbitrum.io/rpc",
  "Polygon#1": "https://polygon.drpc.org",
  "Polygon#2": "https://polygon-bor-rpc.publicnode.com",
  "Avalanche": "https://api.avax.network/ext/bc/C/rpc",
  "Optimism": "https://mainnet.optimism.io",
  "Gnosis": "https://rpc.gnosischain.com",
}
const out = await Promise.all(Object.entries(urls).map(async ([k, url]) => {
  const t0 = Date.now()
  try {
    const c = createPublicClient({ transport: http(url, { timeout: 6000 }) })
    const id = await c.getChainId()
    return `${k}: ok chainId=${id} in ${Date.now() - t0}ms`
  } catch (e) {
    return `${k}: FAIL in ${Date.now() - t0}ms (${(e as Error).message.slice(0, 60)})`
  }
}))
console.log(out.join("\n"))
