const port = process.env.CDP_PORT ?? "9223"

async function newTab(url) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
  return res.json()
}

async function evalJS(ws, expr) {
  ws.send(
    JSON.stringify({
      id: ++ws._id,
      method: "Runtime.evaluate",
      params: { expression: expr, returnByValue: true, awaitPromise: true },
    }),
  )
  return new Promise((r) => ws._pending.push(r))
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  ws._id = 0
  ws._pending = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    const p = ws._pending.shift()
    if (p && m.id) p(m)
  }
  return new Promise((r) => (ws.onopen = () => r(ws)))
}

const tab = await newTab("https://web.telegram.org/a/")
const ws = await connect(tab.webSocketDebuggerUrl)
await evalJS(ws, "new Promise(r => setTimeout(r, 15000))")

const all = await evalJS(
  ws,
  `(async () => {
    const out = { url: location.href, title: document.title }
    out.body = document.body.innerText.slice(0, 200)
    out.ls = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      out.ls[k] = String(localStorage.getItem(k)).slice(0, 40)
    }
    const dbs = await new Promise((r) => { const req = indexedDB.databases(); req.then ? req.then(r) : r(req) }).catch(() => [])
    out.idb = dbs
    return JSON.stringify(out)
  })()`,
)
console.log(all.result?.result?.value)
process.exit(0)
