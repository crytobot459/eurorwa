import { step, classify, welcome, ownerReply } from "./freelance-core.js"
import { quickQuote } from "../api/freelance.js"
import { detectBuild } from "../api/tgbot.js"

const cfg = { usdt: "T1QzZqQwDeYtXfY2pX7uB9aQ3sVfCvNmWj" }

function conv(msgs) {
  let st = { step: "idle" }
  for (const m of msgs) {
    const out = step(st, m, cfg)
    st = out.state
    console.log(`>>> ${m}\n${out.reply}\n`)
    if (out.task) console.log("TASK:", JSON.stringify(out.task, null, 2), "\n")
  }
  return st
}

console.log("== classify ==")
for (const t of [
  "dashboard theo dõi tokenized funds",
  "telegram bot gửi tin",
  "smart contract token erc20",
  "scrape data từ rwa.xyz",
  "fix bug nhỏ trong trang web",
]) {
  console.log(t, "→", classify(t).key)
}

console.log("\n== detectBuild + quickQuote (public bot) ==")
for (const t of [
  "can you build me a dashboard?",
  "what's the top yield?",
  "tôi cần làm bot telegram",
  "làm dashboard theo dõi quỹ",
]) {
  console.log(JSON.stringify(t), "build:", detectBuild(t), "quote:", JSON.stringify(quickQuote(t)))
}

console.log("\n== happy path ==")
conv([
  "/start",
  "build me a dashboard to track rwa funds",
  "ok",
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
])

console.log("== haggle ==")
conv(["/start", "làm bot telegram", "đắt quá", "ok"])

console.log("== owner ==")
let tasks = []
const out1 = step({ step: "idle" }, "dashboard", cfg)
tasks.push(out1.task ?? { ...out1.state, id: "t1", status: "pending" })
console.log(ownerReply("/tasks", tasks))
console.log(ownerReply("/approve t1", tasks))
