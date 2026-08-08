export const NET_RPC: Record<string, { url: string; alt?: string }> = {
  Ethereum: { url: "https://eth.drpc.org", alt: "https://eth.merkle.io" },
  "BNB Chain": { url: "https://bsc-dataseed.binance.org" },
  Base: { url: "https://mainnet.base.org" },
  Arbitrum: { url: "https://arb1.arbitrum.io/rpc" },
  Polygon: { url: "https://polygon.drpc.org", alt: "https://polygon-bor-rpc.publicnode.com" },
  "Avalanche C-Chain": { url: "https://api.avax.network/ext/bc/C/rpc" },
  Optimism: { url: "https://mainnet.optimism.io" },
  Gnosis: { url: "https://rpc.gnosischain.com" },
}

const SEL = {
  supply: "0x18160ddd",
  decimals: "0x313ce567",
  balance: "0x70a08231",
}

const TIMEOUT = 7000

function fmtUnits(wei: bigint, dec: number): number {
  const d = BigInt(dec)
  const base = 10n ** d
  const int = wei / base
  const frac = wei % base
  return Number(int) + Number(frac) / Number(base)
}

async function ethCall(url: string, to: string, data: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) throw new Error(`http ${res.status}`)
  const j = (await res.json()) as { result?: string; error?: { message?: string } }
  if (j.error) throw new Error(j.error.message)
  if (!j.result) throw new Error("no result")
  return j.result
}

const asBig = (hex: string) => BigInt(hex)

function calldataBalance(wallet: string): string {
  const addr = wallet.toLowerCase().replace(/^0x/, "")
  return `${SEL.balance}${addr.padStart(64, "0")}`
}

async function withFallback(
  network: string,
  run: (url: string) => Promise<unknown>,
): Promise<{ ok: boolean; err?: string }> {
  const cfg = NET_RPC[network]
  if (!cfg) return { ok: false, err: `no rpc for ${network}` }
  const urls = [cfg.url, cfg.alt].filter((u): u is string => Boolean(u))
  for (const url of urls) {
    try {
      await run(url)
      return { ok: true }
    } catch (err) {
      if (url === urls.at(-1)) return { ok: false, err: (err as Error).message }
    }
  }
  return { ok: false, err: "rpc fail" }
}

export async function readSupply(
  network: string,
  address: string,
): Promise<{ supply: number | null; decimals: number | null; error?: string }> {
  let supply: number | null = null
  let decimals: number | null = null
  const res = await withFallback(network, async (url) => {
    const [decHex, supHex] = await Promise.all([ethCall(url, address, SEL.decimals), ethCall(url, address, SEL.supply)])
    const dec = Number(asBig(decHex))
    if (dec > 30) throw new Error(`implausible decimals ${dec}`)
    decimals = dec
    supply = fmtUnits(asBig(supHex), dec)
  })
  if (!res.ok) return { supply: null, decimals: null, error: res.err }
  return { supply, decimals }
}

export async function readBalance(
  network: string,
  address: string,
  wallet: string,
): Promise<{ balance: number | null; decimals: number | null; error?: string }> {
  let balance: number | null = null
  let decimals: number | null = null
  const res = await withFallback(network, async (url) => {
    const [decHex, balHex] = await Promise.all([
      ethCall(url, address, SEL.decimals),
      ethCall(url, address, calldataBalance(wallet)),
    ])
    const dec = Number(asBig(decHex))
    if (dec > 30) throw new Error(`implausible decimals ${dec}`)
    decimals = dec
    balance = fmtUnits(asBig(balHex), dec)
  })
  if (!res.ok) return { balance: null, decimals: null, error: res.err }
  return { balance, decimals }
}
