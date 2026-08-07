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

const SYS = `You are NewsAgent — an assistant reading market news for tokenized RWA / money-market funds.
Input: a list of English news items. Output: signals that affect tokenized treasury funds (USYC, BUIDL, USDY, EUTBL, USTBL, CETES...).
Extract only news genuinely related to RWA: rates/Fed, issuer tokenization, treasury fund flows, stablecoin yield, US bond market.
Use fund tickers matching the input names. confidence: 0 low, 1 medium, 2 high. direction reflects the impact on RWA fund yield/flows.
Return ONLY a JSON array [{"topic","fund","direction","confidence","reason"}], empty if no relevant news.`

export async function analyzeNews(items: NewsItem[]): Promise<NewsSignal[]> {
  if (!items.length) return []
  const prompt = items.map((i, idx) => `${idx + 1}. [${i.source}] ${i.title}${i.link ? ` (${i.link})` : ""}`).join("\n")
  try {
    return await jsonChat<NewsSignal[]>(SYS, prompt)
  } catch (err) {
    console.warn(`news LLM fail (${err}) — using empty`)
    return []
  }
}
