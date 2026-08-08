import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  API,
  FundRow,
  Flow,
  FundDetail,
  Overview,
  Analytics,
  AlertItem,
  Rotation,
  Strategy,
  Verification,
  HistoryPoint,
  SplitRow,
  getFunds,
  getFund,
  getFlows,
  getOverview,
  getAnalytics,
  getHistory,
  getAlerts,
  getRotation,
  getStrategy,
  getVerification,
} from "./api"

type Tab = "overview" | "funds" | "yields" | "flows" | "analytics" | "alerts" | "strategy"

const fmtUsd = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

const fmtNav = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`

const checkFail = (c: FundRow["checks"] | null | undefined) => {
  if (!c) return ""
  const fails = Object.entries(c)
    .filter(([, v]) => v === false)
    .map(([k]) => k)
  return fails.length ? `failed: ${fails.join(", ")}` : ""
}

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function Structured({ text }: { text: string | null }) {
  if (!text) return null
  const lines = text
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  return (
    <div className="narr">
      {lines.map((l, i) => {
        const m = l.match(/^([^:]{2,24}):\s?(.*)$/)
        if (!m) return <p key={i}>{l}</p>
        const watch = m[1].toLowerCase().includes("watch")
        return (
          <p key={i} className={watch ? "watch" : ""}>
            <b>{m[1]}:</b> {m[2]}
          </p>
        )
      })}
    </div>
  )
}

function Chips({ funds }: { funds: FundRow[] }) {
  const total = funds.reduce((a, f) => a + f.tvl, 0)
  const top = [...funds].filter((f) => f.yield > 0).sort((a, b) => b.yield - a.yield)[0]
  const gainer = [...funds].filter((f) => f.chg_7d_pct != null).sort((a, b) => b.chg_7d_pct - a.chg_7d_pct)[0]
  return (
    <div className="chips">
      <div className="chip">
        <b>{fmtUsd(total)}</b>
        <span>Total TVL · {funds.length} funds</span>
      </div>
      <div className="chip">
        <b>{top ? `${top.yield.toFixed(2)}%` : "—"}</b>
        <span>Top yield · {top?.ticker ?? ""}</span>
      </div>
      <div className="chip">
        <b className={gainer && gainer.chg_7d_pct >= 0 ? "pos" : "neg"}>{gainer ? fmtPct(gainer.chg_7d_pct) : "—"}</b>
        <span>Best 7d · {gainer?.ticker ?? ""}</span>
      </div>
    </div>
  )
}

const badge = (action: string) => <span className={`badge ${action}`}>{action}</span>

const tipStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }

const donutColors = ["#2563eb", "#16a34a", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4", "#64748b"]

function TrendChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null
  return (
    <div className="agent">
      <h2>📈 Sector size &amp; yield over time</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points}>
            <defs>
              <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="l"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtUsd(v)}
              width={72}
            />
            <YAxis
              yAxisId="r"
              orientation="right"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(2)}%`}
              width={50}
            />
            <Tooltip
              contentStyle={tipStyle}
              formatter={(v: number | string, n: string) =>
                n === "Total TVL" ? fmtUsd(Number(v)) : `${Number(v).toFixed(2)}%`
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              yAxisId="l"
              type="monotone"
              dataKey="total_tvl"
              name="Total TVL"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#tvlGrad)"
            />
            <Line
              yAxisId="r"
              type="monotone"
              dataKey="median_yield"
              name="Median yield"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="meta">
        Total TVL across tracked money-market funds with the median fund yield at each snapshot date.
      </div>
    </div>
  )
}

function Donut({ title, rows, sub }: { title: string; rows: (SplitRow & { name: string })[]; sub: string }) {
  if (!rows.length) return null
  const top = rows.slice(0, 6)
  const other = rows.slice(6).reduce((a, r) => a + r.tvl, 0)
  const data: (SplitRow & { name: string })[] =
    other > 0 ? [...top, { name: "Other", tvl: other, count: 0, share: 0 }] : top
  return (
    <div className="agent">
      <h2>{title}</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="tvl"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              stroke="var(--bg)"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={donutColors[data.indexOf(d) % donutColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => fmtUsd(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="meta">{sub}</div>
    </div>
  )
}

function FlowsBar({ rows }: { rows: { ticker: string; flow: number | null }[] }) {
  const list = [...rows]
    .filter((r) => r.flow != null)
    .sort((a, b) => Math.abs(b.flow ?? 0) - Math.abs(a.flow ?? 0))
    .slice(0, 12)
  if (!list.length) return null
  return (
    <div className="agent">
      <h2>↔️ Net flows by fund</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={list}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="ticker" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtUsd(v)}
              width={72}
            />
            <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => fmtUsd(Number(v))} />
            <Bar dataKey="flow" name="Net flow" radius={[4, 4, 0, 0]}>
              {list.map((r) => (
                <Cell key={r.ticker} fill={(r.flow ?? 0) >= 0 ? "#4ade80" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="meta">24h TVL change per fund vs the previous snapshot.</div>
    </div>
  )
}

function OverviewView({
  ov,
  funds,
  points,
  ver,
}: {
  ov: Overview
  funds: FundRow[]
  points: HistoryPoint[]
  ver: Verification | null
}) {
  const m = ov.macro
  const ok = funds.filter((f) => f.integrity === "ok").length
  const warn = funds.filter((f) => f.integrity === "warn").length
  const fail = funds.filter((f) => f.integrity === "fail").length
  const order = { BUY: 0, HOLD: 1, SELL: 2 } as Record<string, number>
  const sigs = [...ov.signals].sort(
    (a, b) => (order[a.action] ?? 9) - (order[b.action] ?? 9) || a.ticker.localeCompare(b.ticker),
  )
  return (
    <div>
      <div className="agent">
        <h2>🤖 Analyst view — {ov.date}</h2>
        <p>{ov.market_view}</p>
        <div className="meta">
          Updated {fmtTime(ov.generated_at)} · generated by the EuroRWA analyst agent · every report is hashed &amp;
          signed on-chain ({ov.signer.slice(0, 10)}…{ov.signer.slice(-4)}) · hash {ov.hash.slice(0, 12)}…
        </div>
      </div>

      <Chips funds={funds} />

      <div className="chips">
        <div className="chip">
          <b>{m.fear_greed.value}</b>
          <span>Fear &amp; Greed · {m.fear_greed.label}</span>
        </div>
        <div className="chip">
          <b>{m.tbill_yield.toFixed(2)}%</b>
          <span>US T-bill</span>
        </div>
        <div className="chip">
          <b>{m.max_rwa_yield.toFixed(2)}%</b>
          <span>Top RWA yield</span>
        </div>
        <div className="chip">
          <b className={m.spread >= 0 ? "pos" : "neg"}>{fmtPct(m.spread)}</b>
          <span>RWA vs T-bill spread</span>
        </div>
      </div>

      <TrendChart points={points} />

      {ov.verified && (
        <div className="agent">
          <h2>🛡️ Data verification</h2>
          <div className="chips">
            <div className="chip">
              <b className={ov.verified.ok ? "ok" : "bad"}>{ov.verified.ok ? "✓ verified" : "✗ mismatch"}</b>
              <span>Report hash &amp; signature</span>
            </div>
            <div className="chip">
              <b className={fail ? "bad" : warn ? "warn" : "ok"}>
                {ok}/{funds.length}
              </b>
              <span>Funds pass integrity{fail ? ` · ${fail} fail` : warn ? ` · ${warn} warn` : ""}</span>
            </div>
            {ov.attestation && (
              <div className="chip">
                <b className={ov.attestation.attested ? "ok" : "bad"}>
                  {ov.attestation.attested ? "✓ on-chain" : "✗ not attested"}
                </b>
                <span>Attested on-chain</span>
              </div>
            )}
            {ov.hit_rate?.rate != null && (
              <div className="chip">
                <b className={ov.hit_rate.rate >= 0.5 ? "ok" : "warn"}>{Math.round(ov.hit_rate.rate * 100)}%</b>
                <span>
                  Signal hit-rate ({ov.hit_rate.hits}/{ov.hit_rate.n})
                </span>
              </div>
            )}
            {ov.snapshot && (
              <div className="chip">
                <b className={`lag ${ov.snapshot.lag}`}>{ov.snapshot.age_hours.toFixed(1)}h</b>
                <span>Data age · {ov.snapshot.lag}</span>
              </div>
            )}
          </div>
          {ver && ver.funds.length > 0 && (
            <div className="grid-2">
              <CoverageChart funds={ver.funds} />
              <ConsensusDonut consensus={ver.consensus ?? {}} />
            </div>
          )}
          <div className="meta">
            {ov.verified.hash_ok ? "hash matches report body" : "hash mismatch"} ·{" "}
            {ov.verified.sig_ok ? "signature valid" : "signature invalid"} · signer {ov.verified.signer.slice(0, 10)}…
            {ov.verified.signer.slice(-4)} · snapshot {ov.snapshot?.date ?? "n/a"}
            {ov.attestation && (
              <>
                {" "}
                ·{" "}
                {ov.attestation.attested
                  ? `attested ${ov.attestation.key} · block ${ov.attestation.block}`
                  : "not attested on-chain"}
              </>
            )}
          </div>
        </div>
      )}

      {ov.crypto && (
        <div className="agent">
          <h2>🪙 Crypto market</h2>
          <Structured text={ov.crypto_view} />
          <div className="chips">
            <div className="chip">
              <b>{fmtUsd(ov.crypto.mcap.usd)}</b>
              <span className={ov.crypto.mcap.chg_24h_pct >= 0 ? "pos" : "neg"}>
                Mkt cap {fmtPct(ov.crypto.mcap.chg_24h_pct)}
              </span>
            </div>
            <div className="chip">
              <b>{fmtUsd(ov.crypto.volume.usd)}</b>
              <span>24h volume</span>
            </div>
            <div className="chip">
              <b>{fmtUsd(ov.crypto.btc.usd)}</b>
              <span className={ov.crypto.btc.chg_24h >= 0 ? "pos" : "neg"}>BTC {fmtPct(ov.crypto.btc.chg_24h)}</span>
            </div>
            <div className="chip">
              <b>{fmtUsd(ov.crypto.eth.usd)}</b>
              <span className={ov.crypto.eth.chg_24h >= 0 ? "pos" : "neg"}>ETH {fmtPct(ov.crypto.eth.chg_24h)}</span>
            </div>
            <div className="chip">
              <b>{ov.crypto.dominance.btc.toFixed(1)}%</b>
              <span>BTC dominance</span>
            </div>
            <div className="chip">
              <b>{ov.crypto.dominance.eth.toFixed(1)}%</b>
              <span>ETH dominance</span>
            </div>
          </div>
          {(ov.crypto.movers.gainers.length || ov.crypto.movers.losers.length) && (
            <div className="meta">
              {ov.crypto.movers.gainers.length > 0 && (
                <span>Top: {ov.crypto.movers.gainers.map((g) => `${g.sym} ${fmtPct(g.pct)}`).join(" · ")}</span>
              )}
              {ov.crypto.movers.losers.length > 0 && (
                <span> · Flop: {ov.crypto.movers.losers.map((g) => `${g.sym} ${fmtPct(g.pct)}`).join(" · ")}</span>
              )}
            </div>
          )}
          {ov.crypto.trending.length > 0 && <div className="meta">🔥 Trending: {ov.crypto.trending.join(" · ")}</div>}
        </div>
      )}

      {ov.chain && (
        <div className="agent">
          <h2>⛓️ On-chain / Blockchain</h2>
          <Structured text={ov.chain_view} />
          <div className="chips">
            <div className="chip">
              <b>{fmtUsd(ov.chain.defi.tvl_usd)}</b>
              <span>DeFi TVL</span>
            </div>
            <div className="chip">
              <b>{fmtUsd(ov.chain.defi.stables_usd)}</b>
              <span className={ov.chain.defi.stables_chg_24h_pct >= 0 ? "pos" : "neg"}>
                Stablecoins {fmtPct(ov.chain.defi.stables_chg_24h_pct)}
              </span>
            </div>
            <div className="chip">
              <b>${ov.chain.btc.avg_fee_usd.toFixed(2)}</b>
              <span>BTC fee / tx</span>
            </div>
            <div className="chip">
              <b>{ov.chain.btc.tx_24h.toLocaleString()}</b>
              <span>BTC tx / 24h</span>
            </div>
            <div className="chip">
              <b>{ov.chain.eth.tx_24h.toLocaleString()}</b>
              <span>ETH tx / 24h</span>
            </div>
          </div>
          {ov.chain.defi.top.length > 0 && (
            <div className="meta">
              Top chains: {ov.chain.defi.top.map((t) => `${t.name} ${fmtUsd(t.tvl)}`).join(" · ")}
            </div>
          )}
        </div>
      )}

      {ov.scores && ov.scores.length > 0 && (
        <div className="agent">
          <h2>🧮 Fund scores — deterministic</h2>
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Score</th>
                <th>Yield</th>
                <th>Momentum</th>
                <th>Flow</th>
                <th>Stability</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[...ov.scores]
                .sort((a, b) => b.score - a.score)
                .slice(0, 8)
                .map((s) => (
                  <tr key={s.ticker}>
                    <td className="ticker">{s.ticker}</td>
                    <td>
                      <b>{s.score.toFixed(1)}</b>
                    </td>
                    <td>{s.yield_p.toFixed(1)}</td>
                    <td>{s.momentum.toFixed(1)}</td>
                    <td>{s.flow.toFixed(1)}</td>
                    <td>{s.stability.toFixed(1)}</td>
                    <td>
                      <span className="conf">{s.confidence}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="meta">
            Deterministic composite score (0–100) from yield percentile, momentum, flows and stability — reproducible,
            not model-dependent.
          </div>
        </div>
      )}

      <div className="sig-list">
        {sigs.map((s) => (
          <div className="sig" key={s.ticker}>
            <div className="sig-head">
              <span className="ticker">{s.ticker}</span>
              {badge(s.action)}
              <span className="conf">{s.confidence} confidence</span>
            </div>
            <ul>
              {s.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function Table({ rows }: { rows: FundRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Fund</th>
          <th>TVL</th>
          <th>7d</th>
          <th>APY</th>
          <th>NAV</th>
          <th>Holders</th>
          <th>Verif</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.slug}>
            <td className="ticker">{r.ticker}</td>
            <td>{r.name}</td>
            <td>{fmtUsd(r.tvl)}</td>
            <td className={r.chg_7d_pct >= 0 ? "pos" : "neg"}>{fmtPct(r.chg_7d_pct)}</td>
            <td>{r.yield > 0 ? `${r.yield.toFixed(2)}%` : "—"}</td>
            <td>{fmtNav(r.nav)}</td>
            <td>{r.holders || "—"}</td>
            <td>
              <span className={`vmark ${r.integrity}`} title={checkFail(r.checks)}>
                {r.integrity === "ok" ? "✓" : r.integrity === "warn" ? "⚠" : r.integrity === "fail" ? "✗" : "—"}
              </span>{" "}
              <span
                className={`vmark ${r.onchain?.status ?? "na"}`}
                title={`on-chain supply: ${r.onchain ? `${(r.onchain.coverage * 100).toFixed(0)}% verified (${r.onchain.verified.toFixed(0)}/${r.onchain.supply.toFixed(0)})` : "no on-chain data"}`}
              >
                {r.onchain?.status === "ok"
                  ? "⛓✓"
                  : r.onchain?.status === "warn"
                    ? "⛓⚠"
                    : r.onchain?.status === "fail"
                      ? "⛓✗"
                      : "⛓—"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Detail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [d, setD] = useState<FundDetail | null>(null)
  useEffect(() => {
    getFund(slug)
      .then(setD)
      .catch(() => setD(null))
  }, [slug])
  if (!d) return <div className="panel">loading…</div>
  const last = d.history[d.history.length - 1]
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>
          {d.fund.ticker} — {d.fund.name}
        </h2>
        <button onClick={onClose}>×</button>
      </div>
      {last && (
        <div className="stats">
          <div>
            TVL <b>{fmtUsd(last.tvl)}</b>
          </div>
          <div>
            APY <b>{last.yield > 0 ? `${last.yield.toFixed(2)}%` : "—"}</b>
          </div>
          <div>
            7d <b className={last.chg_7d_pct >= 0 ? "pos" : "neg"}>{fmtPct(last.chg_7d_pct)}</b>
          </div>
          <div>
            Holders <b>{last.holders || "—"}</b>
          </div>
        </div>
      )}
      <div className="chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={d.history}>
            <XAxis dataKey="date" />
            <YAxis yAxisId="l" />
            <YAxis yAxisId="r" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="l" type="monotone" dataKey="tvl" stroke="#2563eb" />
            <Line yAxisId="r" type="monotone" dataKey="yield" stroke="#16a34a" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Yields({ rows }: { rows: FundRow[] }) {
  const list = [...rows].filter((r) => r.yield > 0).sort((a, b) => b.yield - a.yield)
  const max = list[0]?.yield ?? 1
  return (
    <div className="bars">
      {list.map((r) => (
        <div className="bar-row" key={r.slug}>
          <span className="bar-label">
            {r.ticker} <i>{fmtUsd(r.tvl)}</i>
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.yield / max) * 100}%` }} />
          </div>
          <span className="bar-val">{r.yield.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  )
}

function Flows({ rows }: { rows: Flow[] }) {
  const list = [...rows].sort((a, b) => (b.flow ?? 0) - (a.flow ?? 0))
  return (
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>TVL</th>
          <th>Net flow (24h)</th>
          <th>7d</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => (
          <tr key={r.slug}>
            <td className="ticker">{r.ticker}</td>
            <td>{fmtUsd(r.tvl)}</td>
            <td className={r.flow != null && r.flow >= 0 ? "pos" : "neg"}>{r.flow == null ? "—" : fmtUsd(r.flow)}</td>
            <td className={r.chg_7d_pct >= 0 ? "pos" : "neg"}>{fmtPct(r.chg_7d_pct)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AnalyticsView({ a }: { a: Analytics }) {
  const c = a.concentration
  const b = a.breadth
  const maxChain = a.chains[0]?.tvl ?? 1
  return (
    <div>
      <div className="agent">
        <h2>🏛️ Institutional analytics — {a.date ?? "n/a"}</h2>
        <div className="chips">
          <div className="chip">
            <b>{fmtUsd(a.total_tvl)}</b>
            <span>Total TVL · {a.fund_count} funds</span>
          </div>
          <div className="chip">
            <b>{a.holders.total.toLocaleString()}</b>
            <span>Total holders</span>
          </div>
          <div className="chip">
            <b>{c.hhi.toFixed(4)}</b>
            <span>HHI concentration</span>
          </div>
          <div className="chip">
            <b>{b.median_yield != null ? `${b.median_yield.toFixed(2)}%` : "—"}</b>
            <span>Median yield · {b.yield_funds} paying</span>
          </div>
          <div className="chip">
            <b className={b.spread != null && b.spread >= 0 ? "pos" : "neg"}>
              {b.spread != null ? `${b.spread.toFixed(2)}pt` : "—"}
            </b>
            <span>Yield spread (max−min)</span>
          </div>
        </div>
      </div>

      <div className="agent">
        <h2>🎯 Concentration</h2>
        <div className="bars">
          {[
            ["Top 3", c.top3_pct],
            ["Top 5", c.top5_pct],
            ["Top 10", c.top10_pct],
          ].map(([label, val]) => (
            <div className="bar-row" key={label as string}>
              <span className="bar-label">
                {label as string} <i>share of TVL</i>
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(val as number) * 1.5}%` }} />
              </div>
              <span className="bar-val">{(val as number).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="meta">Herfindahl index {c.hhi.toFixed(4)} — above 0.25 = concentrated</div>
      </div>

      <div className="agent">
        <h2>🌐 Chain footprint</h2>
        <div className="bars">
          {a.chains.slice(0, 8).map((n) => (
            <div className="bar-row" key={n.name}>
              <span className="bar-label">
                {n.name}{" "}
                <i>
                  {n.count} fund{n.count > 1 ? "s" : ""}
                </i>
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(n.tvl / maxChain) * 100}%` }} />
              </div>
              <span className="bar-val">{n.share.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <Donut
          title="🏢 Issuer concentration"
          rows={a.issuers}
          sub="Share of total TVL by issuer — top 6 + the rest aggregated."
        />
        <FlowsBar rows={a.day_flows} />
      </div>

      {Object.keys(a.currency).length > 0 && (
        <div className="agent">
          <h2>💱 Currency split</h2>
          <div className="chips">
            {Object.entries(a.currency).map(([cur, v]) => (
              <div className="chip" key={cur}>
                <b>
                  {cur.toUpperCase()} · {v.share.toFixed(1)}%
                </b>
                <span>
                  {fmtUsd(v.tvl)} · {v.count} fund{v.count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const sevClass = (s: string) => (s === "high" ? "bad" : s === "warning" ? "warn" : "ok")

const covCol = (status: string) =>
  status === "ok" ? "#4ade80" : status === "fail" ? "#f87171" : status === "warn" ? "#fbbf24" : "#64748b"

const conCol = (name: string) =>
  name === "ok" ? "#4ade80" : name === "single" ? "#2563eb" : name === "mismatch" ? "#f87171" : "#64748b"

function CoverageChart({ funds }: { funds: Verification["funds"] }) {
  const list = [...funds]
    .map((f) => ({ ticker: f.ticker, coverage: f.coverage ?? 0, status: f.status }))
    .sort((a, b) => b.coverage - a.coverage)
  if (!list.length) return null
  return (
    <div className="agent">
      <h2>🧬 On-chain coverage</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={list}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="ticker"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
            />
            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              domain={[0, 1.1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              width={50}
            />
            <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => `${(Number(v) * 100).toFixed(1)}%`} />
            <Bar dataKey="coverage" name="Coverage" radius={[4, 4, 0, 0]}>
              {list.map((f) => (
                <Cell key={f.ticker} fill={covCol(f.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="meta">
        On-chain supply read as % of reported supply — green = fully verified, amber = partial, gray = no on-chain data.
      </div>
    </div>
  )
}

function ConsensusDonut({ consensus }: { consensus: Record<string, number> }) {
  const data = (Object.entries(consensus).filter(([, v]) => v > 0) as [string, number][]).map(([name, value]) => ({
    name,
    value,
  }))
  if (!data.length) return null
  return (
    <div className="agent">
      <h2>🔗 RPC node consensus</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              stroke="var(--bg)"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={conCol(d.name)} />
              ))}
            </Pie>
            <Tooltip contentStyle={tipStyle} formatter={(v: number | string) => Number(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="meta">
        Per-chain node agreement — ok = both RPC nodes agree, single = one node read, mismatch = nodes disagree, none =
        no RPC for chain.
      </div>
    </div>
  )
}

function StrategyView({ rot, strat, ver }: { rot: Rotation | null; strat: Strategy | null; ver: Verification | null }) {
  return (
    <div>
      {rot && (
        <div className="agent">
          <h2>🔄 EUR vs USD rotation — {rot.date}</h2>
          <div className="chips">
            <div className="chip">
              <b>{rot.signal}</b>
              <span>Rotation signal</span>
            </div>
            <div className="chip">
              <b>{rot.benchmarks.estr != null ? `${rot.benchmarks.estr.toFixed(3)}%` : "—"}</b>
              <span>ESTR (ECB)</span>
            </div>
            <div className="chip">
              <b>{rot.benchmarks.sofr != null ? `${rot.benchmarks.sofr.toFixed(2)}%` : "—"}</b>
              <span>SOFR (FRED)</span>
            </div>
            <div className="chip">
              <b className={rot.gap_pt != null && rot.gap_pt >= 0 ? "pos" : "neg"}>
                {rot.gap_pt == null ? "—" : `${rot.gap_pt >= 0 ? "+" : ""}${rot.gap_pt.toFixed(2)}pt`}
              </b>
              <span>Hedged EUR vs best USD gap</span>
            </div>
          </div>
          {rot.best_eur && rot.best_usd && (
            <div className="meta">
              best hedged EUR <b>{rot.best_eur.ticker}</b> {rot.best_eur.hedged?.toFixed(2)}% vs best USD{" "}
              <b>{rot.best_usd.ticker}</b> {rot.best_usd.yield.toFixed(2)}%
            </div>
          )}
          <p className="meta">{rot.note}</p>
        </div>
      )}

      {strat && (
        <div className="agent">
          <h2>🎯 RWA-perp strategy signals — {strat.date}</h2>
          <div className="chips">
            <div className="chip">
              <b>{strat.signal}</b>
              <span>Signal</span>
            </div>
            <div className="chip">
              <b>{strat.top ?? "—"}</b>
              <span>Top collateral</span>
            </div>
          </div>
          <p className="meta">{strat.note}</p>
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>CCY</th>
                <th>APY</th>
                <th>On-chain</th>
                <th>Score</th>
                <th>Carry</th>
              </tr>
            </thead>
            <tbody>
              {strat.rows.map((r) => (
                <tr key={r.ticker}>
                  <td className="ticker">{r.ticker}</td>
                  <td>{r.bucket.toUpperCase()}</td>
                  <td>{r.yield.toFixed(2)}%</td>
                  <td>{r.coverage == null ? "—" : `${(r.coverage * 100).toFixed(0)}%`}</td>
                  <td>{(r.collateral * 100).toFixed(0)}</td>
                  <td className={r.carry != null && r.carry >= 0 ? "pos" : "neg"}>
                    {r.carry == null ? "—" : `${r.carry >= 0 ? "+" : ""}${r.carry.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {strat.pairs.length > 0 && (
            <div className="meta">
              Pairs: {strat.pairs.map((p) => `${p.long} vs ${p.short} (${p.note})`).join(" · ")}
            </div>
          )}
        </div>
      )}

      {ver && (
        <div className="agent">
          <h2>🛡️ On-chain verification — {ver.date}</h2>
          <div className="chips">
            <div className="chip">
              <b>{ver.summary.ok}</b>
              <span>Verified ✓</span>
            </div>
            <div className="chip">
              <b>{ver.summary.warn}</b>
              <span>Partial ⚠</span>
            </div>
            <div className="chip">
              <b>{ver.summary.fail}</b>
              <span>Mismatch ✗</span>
            </div>
            <div className="chip">
              <b>{ver.summary.na}</b>
              <span>Not readable</span>
            </div>
          </div>
          {ver.funds.length > 0 && (
            <div className="grid-2">
              <CoverageChart funds={ver.funds} />
              <ConsensusDonut consensus={ver.consensus ?? {}} />
            </div>
          )}
          {ver.recon && ver.recon.some((r) => !r.reconciled) && (
            <div className="meta">
              ⚠ Supply reconciliation —{" "}
              {ver.recon
                .filter((r) => !r.reconciled)
                .map((r) => `${r.ticker} ${r.delta_pct.toFixed(0)}%`)
                .join(" · ")}
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Reported</th>
                <th>On-chain</th>
                <th>Cov</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ver.funds.map((f) => (
                <tr key={f.ticker}>
                  <td className="ticker">{f.ticker}</td>
                  <td>{f.supply.toFixed(0)}</td>
                  <td>{f.verified.toFixed(0)}</td>
                  <td>{(f.coverage * 100).toFixed(0)}%</td>
                  <td>
                    <span className={`vmark ${f.status}`} title={f.note}>
                      {f.status === "ok" ? "✓" : f.status === "warn" ? "⚠" : f.status === "fail" ? "✗" : "—"}
                    </span>{" "}
                    {f.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AlertsView({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) return <p className="muted">No alerts — all quiet.</p>
  return (
    <div>
      {alerts.map((a) => (
        <div className="sig" key={a.id}>
          <div className="sig-head">
            <span className="ticker">{a.ticker ?? "⚡"}</span>
            <span className={`vmark ${sevClass(a.severity)}`}>
              {a.severity === "high" ? "✗" : a.severity === "warning" ? "⚠" : "✓"}
            </span>
            <span className={`conf ${a.severity}`}>{a.severity}</span>
            <span className="conf">{a.date}</span>
          </div>
          <p>
            <b>{a.title}</b>
          </p>
          <p className="meta">{a.detail}</p>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview")
  const [funds, setFunds] = useState<FundRow[] | null>(null)
  const [flows, setFlows] = useState<Flow[] | null>(null)
  const [ov, setOv] = useState<Overview | null>(null)
  const [hist, setHist] = useState<HistoryPoint[] | null>(null)
  const [an, setAn] = useState<Analytics | null>(null)
  const [al, setAl] = useState<AlertItem[] | null>(null)
  const [rot, setRot] = useState<Rotation | null>(null)
  const [strat, setStrat] = useState<Strategy | null>(null)
  const [ver, setVer] = useState<Verification | null>(null)
  const [err, setErr] = useState("")
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    getFunds()
      .then((b) => setFunds(b.funds))
      .catch((e) => setErr(String(e)))
  }, [])
  useEffect(() => {
    if (tab === "flows")
      getFlows()
        .then((b) => setFlows(b.flows))
        .catch((e) => setErr(String(e)))
  }, [tab])
  useEffect(() => {
    if (tab === "overview") {
      getOverview()
        .then(setOv)
        .catch(() => setOv(null))
      getHistory()
        .then((b) => setHist(b.points))
        .catch(() => setHist([]))
      getVerification()
        .then(setVer)
        .catch(() => setVer(null))
    }
  }, [tab])
  useEffect(() => {
    if (tab === "analytics")
      getAnalytics()
        .then(setAn)
        .catch(() => setAn(null))
  }, [tab])
  useEffect(() => {
    if (tab === "alerts")
      getAlerts()
        .then((b) => setAl(b.alerts))
        .catch(() => setAl([]))
  }, [tab])
  useEffect(() => {
    if (tab === "strategy") {
      getRotation()
        .then(setRot)
        .catch(() => setRot(null))
      getStrategy()
        .then(setStrat)
        .catch(() => setStrat(null))
      getVerification()
        .then(setVer)
        .catch(() => setVer(null))
    }
  }, [tab])

  return (
    <main>
      <header>
        <div className="brand">
          <svg viewBox="0 0 200 200" width="36" height="36" aria-hidden="true">
            <defs>
              <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="13" fill="url(#mark-g)" />
            <circle cx="100" cy="100" r="5" fill="#0f172a" />
            {["162 100", "131 153.7", "69 153.7", "38 100", "69 46.3", "131 46.3"].map(([x, y]) => (
              <circle key={x + y} cx={x} cy={y} r="8" fill="#22d3ee" opacity="0.85" />
            ))}
            {[
              ["100 100", "131 153.7"],
              ["100 100", "69 153.7"],
              ["100 100", "38 100"],
              ["100 100", "69 46.3"],
              ["100 100", "131 46.3"],
            ].map(([a, b]) => (
              <line
                key={a + b}
                x1={a.split(" ")[0]}
                y1={a.split(" ")[1]}
                x2={b.split(" ")[0]}
                y2={b.split(" ")[1]}
                stroke="rgba(148,163,184,.5)"
                strokeWidth="3"
              />
            ))}
            {[
              ["162 100", "131 153.7"],
              ["131 153.7", "69 153.7"],
              ["69 153.7", "38 100"],
              ["38 100", "69 46.3"],
              ["69 46.3", "131 46.3"],
              ["131 46.3", "162 100"],
            ].map(([a, b]) => (
              <line
                key={a + b + "r"}
                x1={a.split(" ")[0]}
                y1={a.split(" ")[1]}
                x2={b.split(" ")[0]}
                y2={b.split(" ")[1]}
                stroke="rgba(52,211,153,.55)"
                strokeWidth="3"
              />
            ))}
          </svg>
          <h1>EuroRWA</h1>
        </div>
        <p>EU tokenized money market funds — data via rwa.xyz + on-chain, snapshotted daily.</p>
        <div className="tabs">
          {(["overview", "funds", "yields", "flows", "analytics", "alerts", "strategy"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
          <a className="tg" href="https://t.me/EuroRWA_Data_bot" target="_blank" rel="noreferrer">
            💬 Telegram
          </a>
        </div>
      </header>

      {err && (
        <div className="err">
          API unreachable at {API}: {err}
        </div>
      )}

      {tab === "overview" &&
        (ov && funds ? (
          <OverviewView ov={ov} funds={funds} points={hist ?? []} ver={ver} />
        ) : (
          <p className="muted">loading…</p>
        ))}

      {tab === "funds" &&
        (funds ? (
          <div
            onClick={(e) => {
              const row = (e.target as HTMLElement).closest("tr")
              const tk = row?.querySelector(".ticker")?.textContent
              if (tk) setSlug(tk.toLowerCase())
            }}
          >
            <Table rows={funds} />
            {slug && <Detail slug={slug} onClose={() => setSlug(null)} />}
          </div>
        ) : (
          <p className="muted">loading…</p>
        ))}

      {tab === "yields" && (funds ? <Yields rows={funds} /> : <p className="muted">loading…</p>)}

      {tab === "flows" && (flows ? <Flows rows={flows} /> : <p className="muted">loading…</p>)}

      {tab === "analytics" && (an ? <AnalyticsView a={an} /> : <p className="muted">loading…</p>)}

      {tab === "alerts" && (al ? <AlertsView alerts={al} /> : <p className="muted">loading…</p>)}

      {tab === "strategy" && <StrategyView rot={rot} strat={strat} ver={ver} />}
    </main>
  )
}
