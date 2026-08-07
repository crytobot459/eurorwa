const token = process.env.TG_TOKEN
const url = process.argv[2]
if (!token || !url) {
  console.error("usage: TG_TOKEN=... bun run scripts/tg-webhook.js https://.../api/tg")
  process.exit(1)
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url, allowed_updates: ["message"] }),
})
console.log(await res.json())
