import { jsonChat } from "./llm"

export interface NewsItem {
  title: string
  link?: string
  source: string
}

export interface NewsSignal {
  topic: string
  fund?: string
  direction: "bullish" | "bearish" | "neutral"
  confidence: 0 | 1 | 2
  reason: string
}

const FEEDS = [
  { source: "coindesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "theblock", url: "https://www.theblock.co/rss.xml" },
  { source: "rwa.xyz", url: "https://www.rwa.xyz/blog/rss.xml" },
]

export async function fetchNews(): Promise<NewsItem[]> {
  const items: NewsItem[] = []
  const results = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const res = await fetch(url, { headers: { "User-Agent": "EuroRWA-analyst/0.1" } })
      if (!res.ok) throw new Error(`http ${res.status}`)
      const xml = await res.text()
      const m = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []
      return m.slice(0, 10).map((block) => {
        const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.at(1) ?? ""
        const link = block.match(/<link>(.*?)<\/link>/)?.at(1) ?? ""
        return { title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(), link, source }
      })
    }),
  )
  results.forEach((r) => {
    if (r.status === "fulfilled") items.push(...r.value)
  })
  return items
}

const SYS = `Bạn là NewsAgent — trợ lý đọc tin tức thị trường tokenized RWA/money-market funds.
Đầu vào: danh sách tin tiếng Anh. Đầu ra: các tín hiệu tác động đến quỹ tokenized treasury (USYC, BUIDL, USDY, EUTBL, USTBL, CETES...).
Chỉ trích xuất tin thực sự liên quan RWA: lãi suất/Fed, issuer tokenization, dòng tiền treasury fund, stablecoin yield, thị trường trái phiếu Mỹ.
Ticker quỹ trùng tên trong input. confidence: 0 thấp, 1 trung bình, 2 cao. direction theo tác động tới yield/dòng tiền quỹ RWA.
Trả CHỈ JSON array [{"topic","fund","direction","confidence","reason"}], rỗng nếu không có tin liên quan.`

export async function analyzeNews(items: NewsItem[]): Promise<NewsSignal[]> {
  if (!items.length) return []
  const prompt = items.map((i, idx) => `${idx + 1}. [${i.source}] ${i.title}${i.link ? ` (${i.link})` : ""}`).join("\n")
  try {
    return await jsonChat<NewsSignal[]>(SYS, prompt)
  } catch (err) {
    console.warn(`news LLM fail (${err}) — dùng rỗng`)
    return []
  }
}
