import { listTabs, connect, evalValue, realClick, waitFor } from "./tg-cdp.js"

const tabs = await listTabs()
const tg = tabs.find((t) => t.url.includes("web.telegram.org"))
const ws = await connect(tg.webSocketDebuggerUrl)

const r = await evalValue(
  ws,
  `(() => {
    const btns = [...document.querySelectorAll("button")]
    const open = btns.find((b) => b.textContent.trim() === "Open")
    if (!open) return "no-open-btn"
    const rect = open.getBoundingClientRect()
    return JSON.stringify({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
  })()`,
)
const { x, y } = JSON.parse(r)
await sendMouse(ws, x, y)
await new Promise((r) => setTimeout(r, 4000))
console.log(
  "after open:",
  await evalValue(
    ws,
    `JSON.stringify({title: document.querySelector(".chat-title")?.textContent, body: document.body.innerText.slice(0, 120)})`,
  ),
)
process.exit(0)

async function sendMouse(ws, x, y) {
  const { send } = await import("./tg-cdp.js")
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
  await send(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
}
