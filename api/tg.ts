import { webhook } from "./tgbot.js"

export const POST = (req: Request) => webhook(req)
export const GET = () => new Response("ok", { status: 200 })
