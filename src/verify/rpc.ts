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

export type Consensus = "ok" | "mismatch" | "single" | "none"

export interface NodeHit {
  url: string
  ok: boolean
  value: number | null
  decimals: number | null
  err?: string
}

const SEL = {
  supply: "0x18160ddd",
  decimals: "0x313ce567",
  balance: "0x70a08231",
}

const TIMEOUT = 7000
const MATCH_TOL = 1e-3

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

async function readValue(url: string, address: string, wallet?: string): Promise<{ value: number; decimals: number }> {
  const [decHex, valHex] = await Promise.all([
    ethCall(url, address, SEL.decimals),
    ethCall(url, address, wallet ? calldataBalance(wallet) : SEL.supply),
  ])
  const dec = Number(asBig(decHex))
  if (dec > 30) throw new Error(`implausible decimals ${dec}`)
  return { value: fmtUnits(asBig(valHex), dec), decimals: dec }
}

interface ReadResult {
  value: number | null
  decimals: number | null
  consensus: Consensus
  delta: number | null
  nodes: NodeHit[]
  error?: string
}

async function dualRead(network: string, address: string, wallet?: string): Promise<ReadResult> {
  const cfg = NET_RPC[network]
  if (!cfg)
    return { value: null, decimals: null, consensus: "none", delta: null, nodes: [], error: `no rpc for ${network}` }
  const urls = [cfg.url, cfg.alt].filter((u): u is string => Boolean(u))
  const settled = await Promise.allSettled(urls.map((url) => readValue(url, address, wallet)))
  const nodes: NodeHit[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? { url: urls[i], ok: true, value: s.value.value, decimals: s.value.decimals }
      : { url: urls[i], ok: false, value: null, decimals: null, err: String((s as PromiseRejectedResult).reason) },
  )
  const hits = nodes.filter((n) => n.ok)
  if (!hits.length)
    return {
      value: null,
      decimals: null,
      consensus: "none",
      delta: null,
      nodes,
      error:
        nodes
          .map((n) => n.err)
          .filter((e): e is string => Boolean(e))
          .join("; ") || "rpc fail",
    }
  if (hits.length === 1)
    return { value: hits[0].value, decimals: hits[0].decimals, consensus: "single", delta: null, nodes }
  const [a, b] = hits
  const aVal = a.value ?? 0
  const bVal = b.value ?? 0
  const denom = Math.max(Math.abs(aVal), Math.abs(bVal))
  const agree =
    a.value != null && b.value != null && a.decimals === b.decimals && Math.abs(aVal - bVal) <= denom * MATCH_TOL
  const delta = a.value != null && b.value != null ? (denom > 0 ? Math.abs(aVal - bVal) / denom : 0) : null
  if (agree) return { value: a.value, decimals: a.decimals, consensus: "ok", delta, nodes }
  return { value: a.value, decimals: a.decimals, consensus: "mismatch", delta, nodes }
}

export async function readSupply(
  network: string,
  address: string,
): Promise<{
  supply: number | null
  decimals: number | null
  consensus: Consensus
  delta: number | null
  nodes: NodeHit[]
  error?: string
}> {
  const r = await dualRead(network, address)
  return {
    supply: r.value,
    decimals: r.decimals,
    consensus: r.consensus,
    delta: r.delta,
    nodes: r.nodes,
    ...(r.error ? { error: r.error } : {}),
  }
}

export async function readBalance(
  network: string,
  address: string,
  wallet: string,
): Promise<{
  balance: number | null
  decimals: number | null
  consensus: Consensus
  delta: number | null
  nodes: NodeHit[]
  error?: string
}> {
  const r = await dualRead(network, address, wallet)
  return {
    balance: r.value,
    decimals: r.decimals,
    consensus: r.consensus,
    delta: r.delta,
    nodes: r.nodes,
    ...(r.error ? { error: r.error } : {}),
  }
}
