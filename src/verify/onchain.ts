import { readSupply } from "./rpc"
import type { Consensus } from "./rpc"
import type { TokenDl } from "../fetch"

export interface ChainCheck {
  network: string
  address: string
  supply: number | null
  decimals: number | null
  consensus: Consensus
  ok: boolean
  fetched_at: string
  nodes: string[]
  delta?: number
  error?: string
}

export interface Recon {
  ticker: string
  reported: number
  verified: number
  delta_pct: number
  reconciled: boolean
  note: string
}

export interface Verdict {
  ticker: string
  slug: string
  supply: number
  verified: number
  coverage: number
  status: "ok" | "warn" | "fail" | "na"
  note: string
  chains: ChainCheck[]
}

export interface VerResult {
  date: string
  verified_at: string
  summary: Record<string, number>
  recon: Recon[]
  funds: Verdict[]
}

const COVER_FULL = 0.9
const OVER = 1.05

export function classify(
  verified: number,
  supply: number,
  readable: number,
  chains: ChainCheck[],
): { status: Verdict["status"]; note: string } {
  if (!readable)
    return {
      status: "na",
      note: `no EVM deployment readable (${chains.length} token${chains.length > 1 ? "s" : ""} listed)`,
    }
  if (supply <= 0) return { status: "na", note: "no reference supply to compare" }
  const bad = chains.filter((c) => c.consensus === "mismatch")
  if (bad.length)
    return {
      status: "warn",
      note: `RPC nodes disagree on ${bad.map((c) => c.network).join(", ")} — on-chain data unreliable`,
    }
  const coverage = verified / supply
  if (verified > supply * OVER)
    return {
      status: "fail",
      note: `on-chain supply exceeds reported by ${((verified / supply - 1) * 100).toFixed(1)}%`,
    }
  if (coverage >= COVER_FULL)
    return { status: "ok", note: `${(coverage * 100).toFixed(0)}% of reported supply verified on-chain, no mismatch` }
  return {
    status: "warn",
    note: `only ${(coverage * 100).toFixed(0)}% of supply verified on-chain — rest on non-EVM or unrpc'd networks`,
  }
}

function reconFund(ticker: string, reported: number, verified: number, hasEVM: boolean): Recon {
  if (!hasEVM) return { ticker, reported, verified, delta_pct: 0, reconciled: false, note: "no EVM deployment listed" }
  if (reported <= 0)
    return { ticker, reported, verified, delta_pct: 0, reconciled: false, note: "no reference supply to compare" }
  const delta_pct = ((verified - reported) / reported) * 100
  const reconciled = verified >= reported * COVER_FULL && verified <= reported * OVER
  return {
    ticker,
    reported,
    verified,
    delta_pct,
    reconciled,
    note: reconciled
      ? `matches reported supply within ${Math.abs(delta_pct).toFixed(1)}%`
      : `diverges from reported by ${delta_pct.toFixed(1)}%`,
  }
}

export async function verifyFunds(
  date: string,
  funds: Array<{ ticker: string; slug: string; supply: number; tokens?: TokenDl[] }>,
): Promise<VerResult> {
  const out = await Promise.all(
    funds.map(async (f) => {
      const toks = f.tokens ?? []
      const results = await Promise.allSettled(toks.map((t) => readSupply(t.network, t.address)))
      const chains: ChainCheck[] = toks.map((t, i) => {
        const r = results[i]
        const v =
          r.status === "fulfilled"
            ? r.value
            : {
                supply: null,
                decimals: null,
                consensus: "none" as Consensus,
                delta: null,
                nodes: [],
                error: String((r as PromiseRejectedResult).reason),
              }
        return {
          network: t.network,
          address: t.address,
          supply: v.supply,
          decimals: v.decimals,
          consensus: v.consensus,
          ok: v.supply != null,
          fetched_at: new Date().toISOString(),
          nodes: v.nodes.map((n) => n.url),
          ...(v.delta != null ? { delta: v.delta } : {}),
          ...(v.error ? { error: v.error } : {}),
        }
      })
      const readable = chains.filter((c) => c.ok)
      const verified = readable.reduce((a, c) => a + (c.supply ?? 0), 0)
      const { status, note } = classify(verified, f.supply, readable.length, chains)
      return {
        ticker: f.ticker,
        slug: f.slug,
        supply: f.supply,
        verified,
        coverage: f.supply > 0 ? verified / f.supply : 0,
        status,
        note,
        chains,
        hasEVM: toks.length > 0,
      }
    }),
  )
  const summary: Record<string, number> = { ok: 0, warn: 0, fail: 0, na: 0 }
  for (const v of out) summary[v.status]++
  const recon = out.map((v) => reconFund(v.ticker, v.supply, v.verified, v.hasEVM))
  return { date, verified_at: new Date().toISOString(), summary, recon, funds: out }
}
