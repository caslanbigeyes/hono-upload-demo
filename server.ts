import { serve } from 'bun'
import app from './index'

const port = 3000

console.log(`🚀 Server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port: port,
})

console.log(`✅ Server is running on http://localhost:${port}`)
