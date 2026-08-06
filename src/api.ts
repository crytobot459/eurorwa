import { serve } from "bun"
import { app } from "../api/_app.js"

serve({ fetch: app.fetch, port: 3000 })
console.log("EuroRWA API on http://localhost:3000")
