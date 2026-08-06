import { app } from "./_app.js"
import { handleMcp } from "./_mcp.js"

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, "") || "/"
  if (path === "/mcp") return handleMcp(req)
  url.pathname = path
  return app.fetch(new Request(url, req))
}

export const GET = (req: Request) => route(req)
export const POST = (req: Request) => route(req)
