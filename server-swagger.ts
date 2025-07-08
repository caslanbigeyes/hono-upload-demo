import { serve } from '@hono/node-server'
import app from './index-with-swagger'

const port = 3002

console.log(`🚀 Server with Swagger UI starting on port ${port}...`)

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
  console.log(`   GET  http://localhost:${port}/doc - OpenAPI JSON`)
  console.log(`   GET  http://localhost:${port}/ui - Swagger UI`)
  console.log(``)
  console.log(`🎯 Open Swagger UI: http://localhost:${port}/ui`)
} catch (error) {
  console.error('❌ Failed to start server:', error)
}
