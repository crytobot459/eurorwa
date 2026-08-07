const geminiKey = process.env.GEMINI_API_KEY
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-flash-latest"
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`

const llmBase = process.env.LLM_BASE_URL
const llmKey = process.env.LLM_API_KEY ?? ""
const llmModel = process.env.LLM_MODEL ?? "gemma4:31b"
const llmMaxTokens = Number(process.env.LLM_MAX_TOKENS ?? 8192)
const minGap = Number(process.env.LLM_MIN_GAP_MS ?? 2500)

export interface ChatMsg {
  role: "user" | "model"
  text: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const MAX_RETRY = 3

let lastCall = 0
async function throttle() {
  const wait = lastCall + minGap - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

async function callGemini(msgs: ChatMsg[], attempt = 0): Promise<string> {
  if (!geminiKey) throw new Error("GEMINI_API_KEY missing — set in .env.local or GEMINI_API_KEY env")
  const body = {
    contents: msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.2 },
  }
  const res = await fetch(`${geminiUrl}?key=${geminiKey}`, {
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
      return callGemini(msgs, attempt + 1)
    }
    throw new Error(`Gemini http ${res.status}: ${txt}`)
  }
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? ""
}

async function callOpenAI(msgs: ChatMsg[], attempt = 0): Promise<string> {
  if (!llmBase) throw new Error("LLM_BASE_URL missing — set LLM_BASE_URL or GEMINI_API_KEY")
  const body: Record<string, unknown> = {
    model: llmModel,
    messages: msgs.map((m) => ({ role: m.role === "model" ? "assistant" : "user", content: m.text })),
    temperature: 0.2,
    max_tokens: llmMaxTokens,
    response_format: { type: "json_object" },
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (llmKey) headers.Authorization = `Bearer ${llmKey}`
  const res = await fetch(`${llmBase.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    if (res.status === 429 && attempt < MAX_RETRY) {
      const retry = Number(res.headers.get("retry-after") ?? 30)
      console.warn(`LLM 429 — retry ${attempt + 1}/${MAX_RETRY} trong ${retry}s`)
      await sleep(retry * 1000)
      return callOpenAI(msgs, attempt + 1)
    }
    throw new Error(`LLM http ${res.status}: ${txt}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ""
}

async function call(msgs: ChatMsg[]): Promise<string> {
  await throttle()
  if (geminiKey) return callGemini(msgs)
  return callOpenAI(msgs)
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
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    console.warn(`jsonChat parse fail: ${(err as Error).message}`)
    console.warn(`raw (first 600): ${cleaned.slice(0, 600)}`)
    throw err
  }
}
