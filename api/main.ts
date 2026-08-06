import { app } from "./_app.js"

function strip(req: Request): Request {
  const url = new URL(req.url)
  if (url.pathname.startsWith("/api")) {
    url.pathname = url.pathname.replace(/^\/api/, "") || "/"
  }
  return new Request(url, req)
}

export const GET = (req: Request) => app.fetch(strip(req))
export const POST = (req: Request) => app.fetch(strip(req))
