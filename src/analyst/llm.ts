const key = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export interface ChatMsg {
  role: "user" | "model"
  text: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const MAX_RETRY = 3

async function call(msgs: ChatMsg[], attempt = 0): Promise<string> {
  if (!key) throw new Error("GEMINI_API_KEY missing — set in .env.local")
  const body = {
    contents: msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.2 },
  }
  const res = await fetch(`${url}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    if (res.status === 429 && attempt < MAX_RETRY) {
      const retry = Number(txt.match(/retryDelay":\s*"?(\d+)"?s/)?.[1] ?? 30)
      console.warn(`Gemini 429 — retry ${attempt + 1}/${MAX_RETRY} trong ${retry}s`)
      await sleep(retry * 1000)
      return call(msgs, attempt + 1)
    }
    throw new Error(`Gemini http ${res.status}: ${txt}`)
  }
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? ""
}

export async function chat(msgs: ChatMsg[]): Promise<string> {
  return call(msgs)
}

export async function jsonChat<T>(sys: string, prompt: string): Promise<T> {
  const raw = await call([
    { role: "user", text: `${sys}\n\nReturn ONLY valid JSON, no markdown fence, correct schema:\n${prompt}` },
  ])
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim()
  return JSON.parse(cleaned) as T
}
