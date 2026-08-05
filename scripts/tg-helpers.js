import { listTabs, connect, evalValue, typeText, send } from "./tg-cdp.js"

export async function getWs() {
  const tabs = await listTabs()
  const tg = tabs.find((t) => t.type === "page" && t.url.includes("web.telegram.org"))
  if (!tg) throw new Error("no telegram tab")
  return connect(tg.webSocketDebuggerUrl)
}

export async function reload(ws) {
  await send(ws, "Page.reload")
  await new Promise((r) => setTimeout(r, 10000))
}

export async function openChat(ws, query) {
  await evalValue(
    ws,
    `(() => { const i = document.querySelector('input[placeholder="Search"]'); i.focus(); return "ok" })()`,
  )
  await typeText(ws, query)
  await new Promise((r) => setTimeout(r, 4500))
  const rect = await evalValue(
    ws,
    `(() => {
      const rows = [...document.querySelectorAll("div.ListItem.chat-item-clickable")]
      const r = rows[0]
      if (!r) return null
      const q = r.getBoundingClientRect()
      return JSON.stringify({ x: q.x + 110, y: q.y + q.height / 2 })
    })()`,
  )
  if (!rect) throw new Error("no search result rows")
  const { x, y } = JSON.parse(rect)
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
  await send(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
  await new Promise((r) => setTimeout(r, 6000))
  const title = await evalValue(ws, `document.querySelector(".chat-title")?.textContent || ""`)
  return title
}

export async function composerText(ws) {
  return evalValue(
    ws,
    `(() => {
      const els = [...document.querySelectorAll(".input-message-input, div.form-control.allow-selection")]
      const el = els[els.length - 1]
      return el ? el.innerText || "" : ""
    })()`,
  )
}

export async function lastMsgText(ws) {
  return evalValue(
    ws,
    `(() => {
      const els = [...document.querySelectorAll(".message-content")]
      return els.length ? els[els.length - 1].textContent.trim().slice(0, 2000) : ""
    })()`,
  )
}

export async function scrollBottom(ws) {
  return evalValue(
    ws,
    `(() => { const el = document.querySelector(".MessageList"); if (!el) return; el.scrollTop = el.scrollHeight })()`,
  )
}

export async function sendMsg(ws, text) {
  const rect = await evalValue(
    ws,
    `(() => {
      const els = [...document.querySelectorAll(".input-message-input, div.form-control.allow-selection")]
      const el = els[els.length - 1]
      if (!el) return null
      el.focus()
      const q = el.getBoundingClientRect()
      return JSON.stringify({ x: q.x + 80, y: q.y + q.height / 2 })
    })()`,
  )
  if (rect) {
    const { x, y } = JSON.parse(rect)
    await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
    await send(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
    await send(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
  }
  await typeText(ws, text)
  await new Promise((r) => setTimeout(r, 500))
  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  })
  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  })
  await new Promise((r) => setTimeout(r, 2500))
  await scrollBottom(ws)
  for (let i = 0; i < 20; i++) {
    const last = await lastMsgText(ws)
    if (last && !last.startsWith(text.slice(0, 20))) return last
    await new Promise((r) => setTimeout(r, 800))
  }
  return lastMsgText(ws)
}
