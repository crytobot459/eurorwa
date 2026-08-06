import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { API, FundRow, Flow, FundDetail, getFunds, getFund, getFlows } from "./api"

type Tab = "funds" | "yields" | "flows"

const fmtUsd = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

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
          <th>Holders</th>
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
            <td>{r.holders || "—"}</td>
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

export default function App() {
  const [tab, setTab] = useState<Tab>("funds")
  const [funds, setFunds] = useState<FundRow[] | null>(null)
  const [flows, setFlows] = useState<Flow[] | null>(null)
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
          {(["funds", "yields", "flows"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {err && (
        <div className="err">
          API unreachable at {API}: {err}
        </div>
      )}

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
    </main>
  )
}
