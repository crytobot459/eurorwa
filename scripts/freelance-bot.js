import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { step, ownerReply, welcome } from "./freelance-core.js"
import { verifyTx } from "./binance.js"

const token = process.env.TG_FREELANCE_TOKEN
const usdt = process.env.USDT_ADDRESS
const owner = process.env.OWNER_CHAT_ID
const group = process.env.GROUP_CHAT_ID
if (!token || !usdt || !owner) {
  console.error("thiếu TG_FREELANCE_TOKEN / USDT_ADDRESS / OWNER_CHAT_ID")
  process.exit(1)
}

const base = `https://api.telegram.org/bot${token}`
const data = join(process.cwd(), "data", "freelance")
const tasksFile = join(data, "tasks.json")
const stateFile = join(data, "state.json")
mkdirSync(data, { recursive: true })

const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d)
let tasks = read(tasksFile, [])
let states = read(stateFile, {})
const saveTasks = () => writeFileSync(tasksFile, JSON.stringify(tasks, null, 2))
const saveStates = () => writeFileSync(stateFile, JSON.stringify(states, null, 2))

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

async function send(chat, text) {
  await fetch(`${base}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  })
}

async function notifyOwner(task) {
  await send(
    owner,
    `🆕 Task #${task.id} — $${task.price} (${task.cat})
Khách: ${esc(task.name || "?")}
Task: ${esc(task.task)}
Proof: ${esc(task.proof || "?")}

/approve ${task.id} khi đã nhận tiền · /tasks để xem`,
  )
}

async function postGroup(text) {
  if (!group) return
  await send(group, text)
}

async function handle(msg) {
  const chat = msg.chat.id
  const text = msg.text ?? (msg.photo ? "📷 screenshot" : "")
  if (!text) return

  if (chat == group && text.startsWith("#[lead]")) {
    const parts = text.split("|")
    const leadChat = parts[0].replace("#[lead] ", "").trim()
    await postGroup(`#[ack] ${leadChat}`)
    return
  }

  if ((chat == owner || chat == group) && /^\/(approve|reject|tasks)/.test(text)) {
    const reply = ownerReply(text, tasks)
    saveTasks()
    if (text.startsWith("/approve ")) {
      const id = text.split(" ")[1]
      const t = tasks.find((x) => x.id === id)
      if (t) {
        await send(t.chat, `✅ Đã xác nhận thanh toán — bắt đầu làm!`)
        await postGroup(`#[approved] ${t.id} — $${t.price}`)
      }
    }
    await send(chat, reply)
    return
  }

  if (text.startsWith("/start")) {
    const state = states[chat] ?? {
      step: "idle",
      chat,
      name: `${msg.from.first_name ?? ""} ${msg.from.last_name ?? ""}`.trim(),
    }
    states[chat] = { ...state, step: "idle" }
    saveStates()
    await send(chat, welcome())
    return
  }

  if (chat == group) return

  const state = states[chat] ?? {
    step: "idle",
    chat,
    name: `${msg.from.first_name ?? ""} ${msg.from.last_name ?? ""}`.trim(),
  }
  const out = step(state, text, { usdt })
  states[chat] = out.state
  saveStates()
  if (out.task) {
    tasks.push(out.task)
    saveTasks()
    await notifyOwner(out.task)
    await postGroup(
      `#[task] ${out.task.id} — $${out.task.price} (${out.task.cat}) — ${esc(out.task.task).slice(0, 60)}`,
    )
    const v = await verifyPayment(out.task)
    if (v.ok) {
      out.task.status = "approved"
      saveTasks()
      await send(
        chat,
        `✅ Đã xác nhận nhận được ${v.amount} USDT (${out.task.proof.slice(0, 12)}…) — bắt đầu làm ngay!`,
      )
      await postGroup(`#[approved] ${out.task.id} — $${out.task.price} (auto-verify Binance)`)
    } else {
      await send(
        chat,
        `⏳ Chưa thấy giao dịch ${out.task.proof.slice(0, 12)}… trong ví Binance. Kiểm tra lại tx hash hoặc chờ chủ xác nhận thủ công.`,
      )
    }
  }
  if (out.reply && !out.task) await send(chat, out.reply)
}

async function verifyPayment(task) {
  try {
    const r = await verifyTx(task.proof.trim())
    if (r.found && r.status === 1) return { ok: true, amount: r.amount }
    return { ok: false }
  } catch (e) {
    console.error("binance verify err:", e)
    return { ok: false }
  }
}

let offset = 0
console.log("freelance bot running...")
while (true) {
  const res = await fetch(`${base}/getUpdates?timeout=30&offset=${offset}&allowed_updates=["message"]`)
  const data = await res.json()
  if (!data.ok) {
    console.error("poll err:", data)
    await Bun.sleep(3000)
    continue
  }
  for (const upd of data.result) {
    offset = upd.update_id + 1
    if (!upd.message) continue
    try {
      const m = upd.message
      console.log("recv:", m.chat.id, m.chat.type, String(m.text || "").slice(0, 50))
      await handle(m)
    } catch (e) {
      console.error("handle err:", e)
    }
  }
}
