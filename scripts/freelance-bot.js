import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { step, ownerReply, welcome, triage, isAccept, isReject } from "./freelance-core.js"
import { verifyTx } from "./binance.js"

const token = process.env.TG_FREELANCE_TOKEN
const usdt = process.env.USDT_ADDRESS
const owner = process.env.OWNER_CHAT_ID
const group = process.env.GROUP_CHAT_ID
if (!token || !usdt || !owner) {
  console.error("missing TG_FREELANCE_TOKEN / USDT_ADDRESS / OWNER_CHAT_ID")
  process.exit(1)
}

const base = `https://api.telegram.org/bot${token}`
const data = join(process.cwd(), "data", "freelance")
const tasksFile = join(data, "tasks.json")
const stateFile = join(data, "state.json")
const leadsFile = join(data, "leads.json")
const templatesFile = join(process.cwd(), "data", "templates.json")
mkdirSync(data, { recursive: true })

const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d)
let tasks = read(tasksFile, [])
let states = read(stateFile, {})
let leads = read(leadsFile, [])
const templates = existsSync(templatesFile) ? JSON.parse(readFileSync(templatesFile, "utf8")) : {}
const saveTasks = () => writeFileSync(tasksFile, JSON.stringify(tasks, null, 2))
const saveStates = () => writeFileSync(stateFile, JSON.stringify(states, null, 2))
const saveLeads = () => writeFileSync(leadsFile, JSON.stringify(leads, null, 2))

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const fill = (tpl, vars) => tpl.replace(/\[(\w+)\]/g, (_, k) => vars[k] ?? `[${k}]`)

async function send(chat, text) {
  await fetch(`${base}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  })
}

async function notifyOwner(text) {
  await send(owner, text)
}

async function postGroup(text) {
  if (!group) return
  await send(group, text)
}

const leadDraft = (lead) => fill(templates.lead_draft ?? "", { NAME: lead.name?.split(" ")[0] || "there" })

async function handleLead(lead) {
  leads.push({ ...lead, created: Date.now(), status: "new" })
  saveLeads()
  const draft = leadDraft(lead)
  await notifyOwner(
    `🕵️ Lead — ${esc(lead.name || "?")}${lead.username ? ` (@${lead.username})` : ""}
Chat: ${lead.chat}
Message: ${esc(lead.text)}

Suggested reply:
${draft}

/send ${lead.chat} to send it · /draft ${lead.chat} <text> for a custom reply · /drop ${lead.chat} to ignore · /leads to list all`,
  )
}

async function handleOwner(text) {
  const parts = text.trim().split(/\s+/)
  const name = parts[0]
  const rest = text.trim().slice(name.length).trim()

  if (name === "/leads") {
    const open = leads.filter((l) => l.status === "new")
    if (!open.length) return send(owner, "No open leads.")
    const rows = open.map((l) => `• ${esc(l.name || "?")} (chat ${l.chat}) — ${esc(l.text).slice(0, 60)}`).join("\n")
    return send(owner, `🕵️ Open leads:\n${rows}`)
  }

  if (name === "/send") {
    const id = parts[1]
    if (!id) return send(owner, "Usage: /send <chatId>")
    const lead = leads.find((l) => l.chat == id)
    const tpl = fill(templates.lead_draft ?? "", { NAME: lead?.name?.split(" ")[0] || "there" })
    await send(id, tpl)
    if (lead) {
      lead.status = "sent"
      saveLeads()
    }
    return send(owner, `✅ Intro sent to chat ${id}.`)
  }

  if (name === "/draft") {
    const id = parts[1]
    const body = rest.slice(String(id).length).trim()
    if (!id || !body) return send(owner, "Usage: /draft <chatId> <your message>")
    await send(id, body)
    const lead = leads.find((l) => l.chat == id)
    if (lead) {
      lead.status = "sent"
      saveLeads()
    }
    return send(owner, `✅ Custom message sent to chat ${id}.`)
  }

  if (name === "/drop") {
    const id = parts[1]
    const lead = leads.find((l) => l.chat == id)
    if (!lead) return send(owner, `No lead for chat ${id}.`)
    lead.status = "dropped"
    saveLeads()
    return send(owner, `Dropped lead from chat ${id}.`)
  }

  if (name === "/deliver") {
    const id = parts[1]
    const body = rest.slice(String(id).length).trim()
    const t = tasks.find((x) => x.id === id)
    if (!t) return send(owner, `Task #${id} not found. Try /tasks.`)
    t.status = "delivered"
    saveTasks()
    states[t.chat] = { ...(states[t.chat] ?? {}), step: "review", taskId: t.id }
    saveStates()
    const tpl = fill(templates.delivered ?? "✅ Delivered! Task #${id} — ${summary}", {
      id: t.id,
      summary: body || t.task,
      proof: t.proof || "?",
    })
    await send(t.chat, tpl)
    await postGroup(`#[delivered] ${t.id} — $${t.price}`)
    return send(owner, `✅ Delivered message sent to task #${id}.`)
  }

  if (/^\/(approve|reject|tasks)/.test(text)) {
    const reply = ownerReply(text, tasks)
    saveTasks()
    if (text.startsWith("/approve ")) {
      const id = text.split(" ")[1]
      const t = tasks.find((x) => x.id === id)
      if (t) {
        await send(t.chat, `✅ Payment confirmed — starting now!`)
        await postGroup(`#[approved] ${t.id} — $${t.price}`)
      }
    }
    return send(owner, reply)
  }

  return send(owner, ownerReply("", tasks))
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

  if (chat == owner || chat == group) {
    if (text.startsWith("/")) return handleOwner(text)
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

  const base = states[chat] ?? {
    step: "idle",
    chat,
    name: `${msg.from.first_name ?? ""} ${msg.from.last_name ?? ""}`.trim(),
  }

  if (base.step === "idle" || base.step === "describe") {
    const kind = triage(text)
    if (kind === "spam") {
      await notifyOwner(`🗑️ Spam from ${esc(base.name || "?")} (chat ${chat}): ${esc(text).slice(0, 80)}`)
      return
    }
    if (kind === "opportunity") {
      await handleLead({
        chat,
        name: base.name,
        username: msg.from.username ?? "",
        text,
      })
      await send(chat, "Thanks for the message! I've noted it and will get back to you shortly.")
      return
    }
  }

  const active = tasks.find((x) => x.chat == chat && (x.status === "delivered" || x.status === "review"))
  if ((base.step === "done" || base.step === "review") && active) {
    const low = text.trim().toLowerCase()
    if (isAccept(low)) {
      active.status = "done"
      saveTasks()
      states[chat] = { ...base, step: "idle" }
      saveStates()
      await send(chat, "✅ Task closed. Need another task? Describe it and I'll quote.")
      await notifyOwner(`✅ Client confirmed task #${active.id} is done.`)
    } else {
      active.status = "review"
      saveTasks()
      states[chat] = { ...base, step: "review" }
      saveStates()
      await send(chat, "Got it — I've passed your feedback on. The owner will reply soon.")
      await notifyOwner(`🔄 Client feedback on #${active.id} (${esc(active.cat)}): ${esc(text).slice(0, 200)}`)
    }
    return
  }

  const out = step(base, text, { usdt })
  states[chat] = out.state
  saveStates()
  if (out.task) {
    tasks.push(out.task)
    saveTasks()
    await notifyOwner(
      `🆕 Task #${out.task.id} — $${out.task.price} (${out.task.cat})
Client: ${esc(out.task.name || "?")} (chat ${out.task.chat})
Task: ${esc(out.task.task)}
Proof: ${esc(out.task.proof || "?")}

/approve ${out.task.id} when payment is confirmed · /tasks to view`,
    )
    await postGroup(
      `#[task] ${out.task.id} — $${out.task.price} (${out.task.cat}) — ${esc(out.task.task).slice(0, 60)}`,
    )
    const v = await verifyPayment(out.task)
    if (v.ok) {
      out.task.status = "approved"
      saveTasks()
      await send(
        chat,
        `✅ Payment confirmed — received ${v.amount} USDT (${out.task.proof.slice(0, 12)}…) — starting now!`,
      )
      await postGroup(`#[approved] ${out.task.id} — $${out.task.price} (Binance auto-verify)`)
    } else {
      await send(
        chat,
        `⏳ I don't see tx ${out.task.proof.slice(0, 12)}… in the Binance wallet yet. Double-check the hash, or wait for manual confirmation by the owner.`,
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
