export const cats = [
  {
    key: "dashboard",
    words: ["dashboard", "frontend", "website", "ui", "chart", "biểu đồ", "giao diện", "landing", "react", "app"],
    lo: 80,
    hi: 150,
  },
  { key: "bot", words: ["bot", "telegram", "discord", "chatbot"], lo: 80, hi: 150 },
  {
    key: "contract",
    words: ["solidity", "contract", "token", "nft", "deploy", "onchain", "blockchain", "viem", "web3"],
    lo: 150,
    hi: 300,
  },
  {
    key: "data",
    words: ["scrape", "crawl", "data", "api", "dữ liệu", "excel", "csv", "report", "báo cáo", "phân tích", "analysis"],
    lo: 40,
    hi: 100,
  },
  { key: "script", words: ["script", "tool", "fix", "sửa", "bug", "mini", "utility", "nhỏ"], lo: 30, hi: 60 },
]

export function classify(text) {
  const low = text.toLowerCase()
  const scores = cats.map((c) => ({ c, n: c.words.filter((w) => low.includes(w)).length }))
  const top = scores.reduce((a, b) => (b.n > a.n ? b : a), { c: { key: "other", lo: 50, hi: 100 }, n: 0 })
  return top.c
}

export const midPrice = (c) => Math.round((c.lo + c.hi) / 2)

export const quickQuote = (text) => {
  const c = classify(text)
  return { cat: c.key, lo: c.lo, hi: c.hi, mid: midPrice(c) }
}

const spamWords = [
  "free vip",
  "earn money fast",
  "get rich",
  "guaranteed profit",
  "double your",
  "100x",
  "pump group",
  "signal group",
  "giveaway",
  "airdrop",
  "claim your",
  "click here",
  "join this group",
  "click the link",
  "onlyfans",
]

const jobStrong = [
  "recruiter",
  "interview",
  "salary",
  "compensation",
  "cv",
  "resume",
  "vacancy",
  "hiring",
  "headhunt",
  "full-time",
  "full time",
  "part-time",
  "part time",
  "job opening",
  "open role",
  "job post",
]

const jobMedium = [
  "opportunity",
  "position",
  "career",
  "employment",
  "we are looking",
  "we're looking",
  "looking for a",
  "our team",
  "join our team",
  "role for a",
  "for the role",
  "quant role",
  "team member",
  "long-term collaboration",
  "hire you",
  "want to hire",
  "we are hiring",
  "we're hiring",
  "looking for a developer",
  "open to working with",
]

const buildWords = [
  "build",
  "make me",
  "custom",
  "hire",
  "freelance",
  "develop",
  "create a",
  "tôi cần",
  "làm giúp",
  "làm cho",
  "đặt hàng",
  "báo giá",
  "nhận task",
  "làm bot",
  "làm dashboard",
  "xây dựng",
  "xây",
  "code cho",
  "code giúp",
  "giúp tôi xây",
  "i need",
  "can you build",
  "want a",
  "want to build",
]

export function triage(text) {
  const low = text.toLowerCase()
  if (spamWords.some((w) => low.includes(w))) return "spam"
  let job = 0
  for (const w of jobStrong) if (low.includes(w)) job += 2
  for (const w of jobMedium) if (low.includes(w)) job += 1
  if (job >= 2) return "opportunity"
  if (buildWords.some((w) => low.includes(w))) return "task"
  return "normal"
}
