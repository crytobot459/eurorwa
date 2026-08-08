import { readSupply } from "./rpc"
import type { TokenDl } from "../fetch"

export interface ChainCheck {
  network: string
  address: string
  supply: number | null
  decimals: number | null
  ok: boolean
  error?: string
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
            : { supply: null, decimals: null, error: String((r as PromiseRejectedResult).reason) }
        return {
          network: t.network,
          address: t.address,
          supply: v.supply,
          decimals: v.decimals,
          ok: v.supply != null,
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
      }
    }),
  )
  const summary: Record<string, number> = { ok: 0, warn: 0, fail: 0, na: 0 }
  for (const v of out) summary[v.status]++
  return { date, verified_at: new Date().toISOString(), summary, funds: out }
}
