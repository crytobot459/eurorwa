import { step, classify, welcome, ownerReply, triage, isAccept } from "./freelance-core.js"
import { quickQuote } from "../api/freelance.js"
import { detectBuild } from "../api/tgbot.js"
import { readFileSync } from "node:fs"

const cfg = { usdt: "T1QzZqQwDeYtXfY2pX7uB9aQ3sVfCvNmWj" }
const templates = JSON.parse(readFileSync("data/templates.json", "utf8"))

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

console.log("\n== triage ==")
for (const t of [
  "we have an open role for a senior bot developer, salary $2k, remote",
  "Hi! StockHunt recruiter here — are you open to an opportunity?",
  "earn 100x get rich quick, click here",
  "build me a telegram bot for my shop",
  "i need a dashboard for tokenized funds",
  "hi, can you make a dashboard?",
  "hello how are you",
]) {
  console.log(JSON.stringify(t), "→", triage(t))
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

console.log("\n== happy path (EN) ==")
const st1 = conv([
  "/start",
  "build me a dashboard to track rwa funds",
  "ok",
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
])
console.log("accept ok?", isAccept("ok"), "| accept dao?", isAccept("đồng ý"))

console.log("\n== haggle (EN) ==")
conv(["/start", "make a telegram bot", "too expensive", "ok"])

console.log("\n== delivered → review ==")
let st2 = { step: "done", taskId: "abc123", chat: 1, name: "T", task: "dashboard", cat: "dashboard", price: 115 }
console.log("while delivered: sent ->", step(st2, "can you change the color?", cfg).reply)
console.log("while delivered: ok ->", step(st2, "ok", cfg).reply)

console.log("\n== owner ==")
let tasks = []
const out1 = step({ step: "idle" }, "dashboard", cfg)
tasks.push(out1.task ?? { ...out1.state, id: "t1", status: "pending" })
console.log(ownerReply("/tasks", tasks))
console.log(ownerReply("/approve t1", tasks))

console.log("\n== templates ==")
console.log("intro has $ ranges:", templates.intro.includes("$80-150"))
console.log("lead_draft has no-call note:", templates.lead_draft.includes("written, async"))
console.log("recruiter answers:", Object.keys(templates.recruiter).length)
console.log("no_call present:", !!templates.no_call)
console.log("delivered has #${id}:", templates.delivered.includes("${id}"))
