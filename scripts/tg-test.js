import { getWs, reload, openChat, sendMsg, composerText, lastMsgText } from "./tg-helpers.js"

const ws = await getWs()
await reload(ws)
console.log("opening BotFather...")
const title = await openChat(ws, "BotFather")
console.log("title:", title)
console.log("composer:", JSON.stringify(await composerText(ws)))
console.log("last:", JSON.stringify(await lastMsgText(ws)))
const reply = await sendMsg(ws, "/newbot")
console.log("reply:", JSON.stringify(reply))
console.log("composer after:", JSON.stringify(await composerText(ws)))
process.exit(0)
