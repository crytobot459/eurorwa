import { keccak256, toBytes, recoverAddress } from "viem"

const EUR = new Set(["eurSAFO", "EUTBL", "EUROB", "NRW1"])

export async function verifyReport(rep) {
  const out = { ok: false, hash_ok: false, sig_ok: false, signer: rep?.signer ?? null }
  if (!rep?.hash || !rep?.signature) return out
  try {
    const { signer, hash, signature, attestation, ...body } = rep
    out.hash_ok = keccak256(toBytes(JSON.stringify(body))) === hash
    try {
      const addr = await recoverAddress({ hash, signature })
      out.sig_ok = addr.toLowerCase() === signer.toLowerCase()
    } catch {
      out.sig_ok = false
    }
    out.ok = out.hash_ok && out.sig_ok
  } catch {
    out.hash_ok = false
  }
  return out
}

export function verifyAttestation(rep) {
  const att = rep?.attestation
  if (!att?.key || !att?.tx) return { attested: false, reason: "no on-chain attestation" }
  const hashOk = att.hash?.toLowerCase() === rep.hash?.toLowerCase()
  const signerOk = att.signer?.toLowerCase() === rep.signer?.toLowerCase()
  return {
    attested: hashOk && signerOk,
    key: att.key,
    tx: att.tx,
    block: att.block ?? null,
    timestamp: att.timestamp ?? null,
    hash_ok: hashOk,
    signer_ok: signerOk,
  }
}

function benchOf(snap) {
  const usd = snap.funds.find((f) => f.ticker === "USTBL")?.yield ?? 0
  const eur = Math.max(0, ...snap.funds.filter((f) => EUR.has(f.ticker)).map((f) => f.yield ?? 0))
  return { usd, eur }
}

function yieldOk(f, bench) {
  const y = f.yield ?? 0
  if (y <= 0) return null
  const ref = EUR.has(f.ticker) ? bench.eur : bench.usd
  if (!ref) return null
  return y <= ref + 2.5 && y >= ref - 3
}

export function verifySnapshot(snap, prev) {
  const bench = benchOf(snap)
  const prevBy = new Map((prev?.funds ?? []).map((f) => [f.slug, f]))
  const funds = snap.funds.map((f) => {
    const p = prevBy.get(f.slug)
    const tvl = f.tvl ?? 0
    const tvl7 = f.tvl_7d ?? 0
    const chg = f.chg_7d_pct ?? 0
    const checks = []
    if (tvl7 > 0 && tvl > 0) checks.push(["self", Math.abs(tvl7 * (1 + chg / 100) - tvl) / tvl <= 0.01])
    const nav = f.supply > 0 ? tvl / f.supply : null
    if (nav && p?.supply > 0 && p?.tvl > 0) {
      const navPrev = p.tvl / p.supply
      checks.push(["nav", Math.abs(nav - navPrev) / navPrev <= 0.05])
    }
    const y = yieldOk(f, bench)
    if (y !== null) checks.push(["yield", y])
    const failed = checks.filter(([, ok]) => !ok)
    const integrity = failed.length ? "fail" : checks.length >= 2 ? "ok" : checks.length > 0 ? "warn" : "na"
    return {
      slug: f.slug,
      ticker: f.ticker,
      nav: nav ? Number(nav.toFixed(4)) : null,
      checks: Object.fromEntries(checks),
      integrity,
    }
  })
  const scored = funds.filter((f) => f.integrity !== "na")
  return {
    checked: scored.length,
    ok: scored.filter((f) => f.integrity === "ok").length,
    warn: scored.filter((f) => f.integrity === "warn").length,
    fail: scored.filter((f) => f.integrity === "fail").length,
    funds,
  }
}

export function lagOf(iso) {
  if (!iso) return null
  const ageHours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3.6e6)
  const lag = ageHours < 24 ? "fresh" : ageHours < 72 ? "stale" : "critical"
  return { age_hours: Math.round(ageHours * 10) / 10, lag }
}
