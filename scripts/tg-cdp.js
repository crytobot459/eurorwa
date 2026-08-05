const port = process.env.CDP_PORT ?? "9222"

export async function newTab(url) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
  return res.json()
}

export async function listTabs() {
  return fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
}

export async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  ws._id = 0
  ws._pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    const p = ws._pending.get(m.id)
    if (p) {
      ws._pending.delete(m.id)
      p(m)
    }
  }
  await new Promise((r) => (ws.onopen = r))
  return ws
}

export function send(ws, method, params = {}) {
  ws.send(JSON.stringify({ id: ++ws._id, method, params }))
  return new Promise((r) => ws._pending.set(ws._id, r))
}

export function evalJS(ws, expr) {
  return send(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
}

export async function evalValue(ws, expr) {
  const r = await evalJS(ws, expr)
  return r.result?.result?.value
}

export async function waitFor(ws, expr, ms = 25000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const v = await evalValue(ws, expr)
    if (v) return v
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`waitFor timeout: ${expr}`)
}

export async function clickText(ws, text) {
  return evalValue(
    ws,
    `(() => {
      const q = ${JSON.stringify(text)}
      const els = [...document.querySelectorAll("button, [role=button], .btn, .popup-body div, div")].filter((e) => e.children.length === 0)
      const el = els.find((e) => e.textContent.trim() === q) || els.find((e) => e.textContent.includes(q))
      if (!el) return "not-found: " + q
      el.click()
      return "clicked: " + q
    })()`,
  )
}

export async function rectFor(ws, text) {
  return evalValue(
    ws,
    `(() => {
      const q = ${JSON.stringify(text)}
      const els = [...document.querySelectorAll("button, [role=button], .btn, .popup-body div, div, .btn-primary, .btn-secondary")].filter((e) => e.children.length === 0)
      const el = els.find((e) => e.textContent.trim() === q) || els.find((e) => e.textContent.includes(q))
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, tag: el.tagName, cls: el.className }
    })()`,
  )
}

export async function realClick(ws, text) {
  const r = await rectFor(ws, text)
  if (!r) return "no-rect: " + text
  const { x, y } = r
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
  await send(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
  return `clicked-at: ${x.toFixed(0)},${y.toFixed(0)}`
}

export function typeText(ws, text) {
  return send(ws, "Input.insertText", { text })
}

export async function sendKey(ws, key, code, vk) {
  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
  })
  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
  })
}
