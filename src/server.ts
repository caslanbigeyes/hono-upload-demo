import { serve } from '@hono/node-server'
import app from './app'

const port = parseInt(process.env.PORT || '3003')

console.log('🚀 Starting Resume API server...')

try {
  serve({
    fetch: app.fetch,
    port: port,
  })
  
  console.log(`✅ Resume API server is running on http://localhost:${port}`)
  console.log(`📝 Available endpoints:`)
  console.log(`   GET  http://localhost:${port}/ - Health check`)
  console.log(`   POST http://localhost:${port}/api/auth/register - User registration`)
  console.log(`   POST http://localhost:${port}/api/auth/login - User login`)
  console.log(`   GET  http://localhost:${port}/api/users/me - Get current user`)
  console.log(`   GET  http://localhost:${port}/api/resumes - Get user resumes`)
  console.log(`   GET  http://localhost:${port}/api/doc - OpenAPI JSON`)
  console.log(`   GET  http://localhost:${port}/api/ui - Swagger UI`)
  console.log(``)
  console.log(`🎯 Open Swagger UI: http://localhost:${port}/api/ui`)
  console.log(`📚 API Documentation: http://localhost:${port}/api/doc`)
} catch (error) {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
}
