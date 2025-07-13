import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'

// Routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import resumeRoutes from './routes/resumes'
import personalInfoRoutes from './routes/personal-info'
import educationRoutes from './routes/educations'
import experienceRoutes from './routes/experiences'
import projectRoutes from './routes/projects'
import skillRoutes from './routes/skills'
import pdfExportRoutes from './routes/pdf-export'

// Database
import { testDatabaseConnection } from './lib/database'

const app = new OpenAPIHono()

// Middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))

app.use('*', logger())
app.use('*', prettyJSON())

// 安全中间件
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
}))

// 请求超时
app.use('*', timeout(30000)) // 30秒超时

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Resume API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// 详细健康检查
app.get('/health', async (c) => {
  try {
    // 检查数据库连接
    await testDatabaseConnection()

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    })
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503)
  }
})

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/resumes', resumeRoutes)
app.route('/api/personal-info', personalInfoRoutes)
app.route('/api/educations', educationRoutes)
app.route('/api/experiences', experienceRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/skills', skillRoutes)
app.route('/api/pdf-export', pdfExportRoutes)

// OpenAPI Documentation
app.doc('/api/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Resume Management API',
    description: 'A comprehensive API for managing resumes with AI-powered optimization',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3004}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  // 移除全局安全要求，让每个路由自己决定是否需要认证
  // security: [
  //   {
  //     bearerAuth: [],
  //   },
  // ],
})

// Swagger UI
app.get('/api/ui', swaggerUI({ url: '/api/doc' }))

// Error handling
app.onError((err, c) => {
  console.error('Application error:', err)
  return c.json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Initialize database connection
testDatabaseConnection().then((connected) => {
  if (connected) {
    console.log('📦 Resume API initialized')
    console.log('🗄️  Database connected')
  } else {
    console.error('❌ Failed to connect to database')
  }
})

export default app
