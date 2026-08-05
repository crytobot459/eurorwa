import { classify, midPrice } from "../api/freelance.js"

export { classify }

export function welcome() {
  return `🤖 EuroRWA — Freelance intake

Tôi nhận các task nhỏ: bot, dashboard, web scraper, smart contract, tool...
• Dashboard/frontend: $80-150
• Bot Telegram/Discord: $80-150
• Data/API/scrape: $40-100
• Smart contract/onchain: $150-300
• Script/tool nhỏ: $30-60

Mô tả task của bạn (1-2 câu), tôi báo giá ngay.`
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function quoteText(st) {
  return `Đã rõ! Task: "${esc(st.task)}"

📦 Loại: ${st.cat}
💰 Giá: $${st.price} (trả 100% trước khi làm)

Gõ "ok" để chốt, hoặc trả giá.`
}

function payText(st, cfg) {
  if (!cfg.usdt) return "Khoản thanh toán chưa cấu hình — vui lòng thử lại sau."
  return `✅ Chốt $${st.price}.

Chuyển USDT (TRC20) 100% trước khi làm tới ví Binance:
<code>${cfg.usdt}</code>

Gửi tx hash hoặc ảnh screenshot khi đã chuyển. Tôi xác nhận rồi bắt đầu ngay.`
}

const isOk = (low) =>
  low === "ok" ||
  /^(ok luôn|ok bro|đồng ý|đồng y|chốt|chốt luôn|được|được luôn|agree|accept|yes|yeah|done|good)$/.test(low) ||
  low.startsWith("ok ")

const isHaggle = (low) =>
  ["đắt", "đắt quá", "giảm", "bớt", "rẻ hơn", "cheaper", "discount", "giá cao", "overpriced"].some((h) =>
    low.includes(h),
  )

const isReject = (low) => /^(no|không|k|đổi|khác|change|other)$/.test(low) || low.includes("không thích")

const isProof = (text, low) =>
  /0x[0-9a-fA-F]{20,}/.test(text) ||
  /^[0-9a-fA-F]{64}$/.test(text.trim()) ||
  /(paid|sent|chuyển|gửi|thanh toán|xong|screenshot)/.test(low)

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
    if (isOk(low)) {
      const st = { ...state, step: "pay" }
      return { state: st, reply: payText(st, cfg) }
    }
    if (isHaggle(low)) {
      const price = state.discounted ? state.price : Math.round(state.price * 0.8)
      const st = { ...state, step: "quote", price, discounted: true }
      return { state: st, reply: `Giá mới: $${price}. Gõ "ok" để chốt.` }
    }
    if (isReject(low))
      return { state: { ...state, step: "describe" }, reply: "OK, bạn muốn làm gì khác? Mô tả lại nhé." }
    return { state, reply: `Chưa rõ ý bạn. Gõ "ok" chốt $${state.price}, trả giá, hoặc mô tả task khác.` }
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
      return { state: { ...state, step: "done" }, reply: "Đã nhận! Tôi xác nhận thanh toán và bắt đầu làm ngay.", task }
    }
    return { state, reply: "Gửi tx hash (0x...) hoặc ảnh screenshot sau khi chuyển USDT nhé." }
  }

  return { state, reply: "Task của bạn đang được xử lý. Có task mới? Gõ mô tả để tôi báo giá." }
}

export const ownerReply = (cmd, tasks) => {
  const parts = cmd.trim().split(/\s+/)
  const name = parts[0]
  const id = parts[1]
  if (name === "/tasks") {
    if (!tasks.length) return "Chưa có task nào."
    return tasks.map((t) => `#${t.id} — $${t.price} — ${t.cat} — ${t.status}`).join("\n")
  }
  if (name === "/approve" || name === "/reject") {
    const t = tasks.find((x) => x.id === id)
    if (!t) return `Không thấy task #${id}. Gõ /tasks.`
    t.status = name === "/approve" ? "approved" : "rejected"
    return `#${t.id} → ${t.status}`
  }
  return "Lệnh owner: /tasks, /approve &lt;id&gt;, /reject &lt;id&gt;"
}
