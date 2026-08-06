import { handleMcp } from "../api/_mcp.js"

const base = "http://internal"
const opts = { method: "POST", headers: { "Content-Type": "application/json" } }

const rpc = async (body) => {
  const res = await handleMcp(new Request(`${base}/mcp`, { ...opts, body: JSON.stringify(body) }))
  return { status: res.status, json: await res.json().catch(() => null) }
}

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(
    `${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : `\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`}`,
  )
}
const has = (label, cond) => {
  if (!cond) fail++
  console.log(`${cond ? "PASS" : "FAIL"} ${label}`)
}

const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })
check("initialize protocolVersion", init.json?.result?.protocolVersion, "2025-03-26")
check("initialize serverInfo", init.json?.result?.serverInfo, { name: "eurorwa-analyst", version: "1.0.0" })

const initOld = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2099-01-01" } })
check("initialize unknown protocol falls back", initOld.json?.result?.protocolVersion, "2025-03-26")

const ping = await rpc({ jsonrpc: "2.0", id: 2, method: "ping" })
check("ping", ping.json?.result, {})

const tools = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" })
check(
  "tools/list names",
  tools.json?.result?.tools.map((t) => t.name),
  ["overview", "funds", "analytics", "alerts"],
)

for (const name of ["overview", "funds", "analytics", "alerts"]) {
  const r = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name } })
  has(`tools/call ${name} ok`, r.json?.result?.content?.[0]?.text?.startsWith("{") === true)
}

const badTool = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope" } })
check("tools/call unknown tool", badTool.json?.error?.code, -32602)

const resources = await rpc({ jsonrpc: "2.0", id: 6, method: "resources/list" })
check(
  "resources/list",
  resources.json?.result?.resources.map((r) => r.uri),
  ["eurorwa://analyst/latest", "eurorwa://funds/latest"],
)

const read1 = await rpc({
  jsonrpc: "2.0",
  id: 7,
  method: "resources/read",
  params: { uri: "eurorwa://analyst/latest" },
})
has("resources/read analyst", read1.json?.result?.contents?.[0]?.text?.startsWith("{") === true)

const readBad = await rpc({ jsonrpc: "2.0", id: 8, method: "resources/read", params: { uri: "eurorwa://nope" } })
check("resources/read unknown uri", readBad.json?.error?.code, -32602)

const batch = await rpc([
  { jsonrpc: "2.0", id: 9, method: "ping" },
  { jsonrpc: "2.0", id: 10, method: "ping" },
])
has("batch ping returns array", Array.isArray(batch.json) && batch.json.length === 2)

const notif = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })
check("notification returns null body", notif.json, null)

const unknownMethod = await rpc({ jsonrpc: "2.0", id: 11, method: "wat/nope" })
check("unknown method error", unknownMethod.json?.error?.code, -32601)

const badJson = await handleMcp(new Request(`${base}/mcp`, { method: "POST", body: "{not json" }))
check("parse error", badJson.status, 400)

const get = await handleMcp(new Request(`${base}/mcp`, { method: "GET" }))
check("GET returns 405", get.status, 405)

const options = await handleMcp(new Request(`${base}/mcp`, { method: "OPTIONS" }))
check("OPTIONS returns 204", options.status, 204)

const noOrigin = await handleMcp(
  new Request(`${base}/mcp`, { method: "GET", headers: { Origin: "https://example.com" } }),
)
has("CORS origin echo", noOrigin.headers.get("access-control-allow-origin") === "https://example.com")

console.log(fail ? `\n${fail} FAILED` : "\nALL PASS")
process.exit(fail ? 1 : 0)
