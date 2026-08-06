import { classify, midPrice, triage } from "../api/freelance.js"

export { classify, triage }

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function welcome() {
  return `🤖 EuroRWA — Freelance intake

I handle small tasks: bots, dashboards, scrapers, smart contracts, tools...
• Dashboard / frontend: $80-150
• Telegram / Discord bot: $80-150
• Data / API / scrape: $40-100
• Smart contract / onchain: $150-300
• Small script / tool: $30-60

Describe your task in 1-2 sentences and I'll quote a price right away.`
}

function quoteText(st) {
  return `Got it! Task: "${esc(st.task)}"

📦 Category: ${st.cat}
💰 Price: $${st.price} (100% upfront before work starts)

Reply "ok" to confirm, or counter-offer.`
}

function payText(st, cfg) {
  if (!cfg.usdt) return "Payment is not configured — please try again later."
  return `✅ Confirmed at $${st.price}.

Send USDT (TRC20) 100% upfront to the Binance wallet:
<code>${cfg.usdt}</code>

Send the tx hash or a screenshot once you've transferred. I verify it and start right away.`
}

export function isAccept(low) {
  return (
    low === "ok" ||
    /^(ok luôn|ok bro|đồng ý|đồng y|chốt|chốt luôn|được|được luôn|agree|accept|yes|yeah|done|good|great|perfect)$/.test(
      low,
    ) ||
    low.startsWith("ok ")
  )
}

const isHaggle = (low) =>
  [
    "đắt",
    "đắt quá",
    "giảm",
    "bớt",
    "rẻ hơn",
    "cheaper",
    "discount",
    "giá cao",
    "overpriced",
    "expensive",
    "too much",
    "can you lower",
    "price",
  ].some((h) => low.includes(h))

export function isReject(low) {
  return /^(no|nope|không|k|đổi|khác|change|other|stop|cancel)$/.test(low) || low.includes("không thích")
}

const isProof = (text, low) =>
  /0x[0-9a-fA-F]{20,}/.test(text) ||
  /^[0-9a-fA-F]{64}$/.test(text.trim()) ||
  /(paid|sent|chuyển|gửi|thanh toán|xong|screenshot|transferred|payment|hash)/.test(low)

export function step(state, text, cfg) {
  const low = text.trim().toLowerCase()
  const first = low === "/start" || low === "/menu" || low === "/help"

  if (first) return { state: { step: "describe", task: "" }, reply: welcome() }

  if (state.step === "idle" || state.step === "describe") {
    const cat = classify(text)
    const price = midPrice(cat)
    const st = { step: "quote", task: text.trim(), cat: cat.key, price }
    return { state: st, reply: quoteText(st) }
  }

  if (state.step === "quote") {
    if (isAccept(low)) {
      const st = { ...state, step: "pay" }
      return { state: st, reply: payText(st, cfg) }
    }
    if (isHaggle(low)) {
      const price = state.discounted ? state.price : Math.round(state.price * 0.8)
      const st = { ...state, step: "quote", price, discounted: true }
      return { state: st, reply: `New price: $${price}. Reply "ok" to confirm.` }
    }
    if (isReject(low))
      return {
        state: { ...state, step: "describe" },
        reply: "OK — want something different? Describe it and I'll re-quote.",
      }
    return {
      state,
      reply: `Not sure what you mean. Reply "ok" to lock $${state.price}, counter-offer, or describe a different task.`,
    }
  }

  if (state.step === "pay") {
    if (isProof(text, low)) {
      const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`
      const task = {
        id,
        chat: state.chat,
        name: state.name,
        task: state.task,
        cat: state.cat,
        price: state.price,
        created: Date.now(),
        proof: text,
        status: "pending",
      }
      return {
        state: { ...state, step: "done", taskId: id },
        reply: "Received! I'll verify the payment and start working. You'll get a confirmation shortly.",
        task,
      }
    }
    return { state, reply: "Send the tx hash (0x...) or a screenshot after transferring USDT." }
  }

  if (state.step === "done" || state.step === "review") {
    return { state, reply: "Your task is being handled. Have a new task? Describe it and I'll quote." }
  }

  return { state, reply: "Your task is being handled. Have a new task? Describe it and I'll quote." }
}

export const ownerReply = (cmd, tasks) => {
  const parts = cmd.trim().split(/\s+/)
  const name = parts[0]
  const id = parts[1]
  if (name === "/tasks") {
    if (!tasks.length) return "No tasks yet."
    return tasks.map((t) => `#${t.id} — $${t.price} — ${t.cat} — ${t.status}`).join("\n")
  }
  if (name === "/approve" || name === "/reject") {
    const t = tasks.find((x) => x.id === id)
    if (!t) return `Task #${id} not found. Try /tasks.`
    t.status = name === "/approve" ? "approved" : "rejected"
    return `#${t.id} → ${t.status}`
  }
  return "Owner commands: /tasks, /approve <id>, /reject <id>, /deliver <id> <msg>, /leads, /send <chatId>, /draft <chatId> <text>, /drop <chatId>"
}
