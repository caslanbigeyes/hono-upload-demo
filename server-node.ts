import { serve } from '@hono/node-server'
import app from './index'

const port = 3001

console.log(`🚀 Server starting on port ${port}...`)

try {
  serve({
    fetch: app.fetch,
    port: port,
  })
  console.log(`✅ Server is running on http://localhost:${port}`)
  console.log(`📝 Available endpoints:`)
  console.log(`   GET  http://localhost:${port}/`)
  console.log(`   POST http://localhost:${port}/upload`)
  console.log(`   GET  http://localhost:${port}/images`)
} catch (error) {
  console.error('❌ Failed to start server:', error)
}
