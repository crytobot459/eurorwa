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
