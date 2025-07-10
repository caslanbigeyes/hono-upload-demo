import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static'

import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const app = new OpenAPIHono()
const prisma = new PrismaClient()

console.log('📦 Hono OpenAPI app initialized')
console.log('🗄️  Prisma client initialized')

// 定义 Zod schemas
const ImageSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  filename: z.string().openapi({ example: 'image.jpg' }),
  path: z.string().openapi({ example: '/uploads/1234567890-image.jpg' }),
  createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' })
}).openapi('Image')

const UploadResponseSchema = z.object({
  message: z.string().openapi({ example: 'File uploaded successfully' }),
  data: ImageSchema
}).openapi('UploadResponse')

const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: 'No file uploaded' })
}).openapi('ErrorResponse')

const ImagesResponseSchema = z.array(ImageSchema).openapi('ImagesResponse')

const StatusResponseSchema = z.object({
  message: z.string().openapi({ example: 'Hono Upload Demo API is running!' })
}).openapi('StatusResponse')

// 根路由
const statusRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'API Status Check',
  description: 'Check if the API is running',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: StatusResponseSchema,
        },
      },
      description: 'API status',
    },
  },
})

app.openapi(statusRoute, (c) => {
  return c.json({ message: 'Hono Upload Demo API is running!' })
})

// 静态文件访问
app.use('/uploads/*', serveStatic({ root: './' }))

// 文件上传路由
const uploadRoute = createRoute({
  method: 'post',
  path: '/upload',
  summary: 'Upload File',
  description: 'Upload a file to the server',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({
              type: 'string',
              format: 'binary',
              description: 'File to upload'
            })
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UploadResponseSchema,
        },
      },
      description: 'File uploaded successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - no file uploaded',
    },
  },
})

app.openapi(uploadRoute, async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const filename = `${Date.now()}-${file.name}`
  const uploadDir = './uploads'
  mkdirSync(uploadDir, { recursive: true })

  const filepath = join(uploadDir, filename)
  const arrayBuffer = await file.arrayBuffer()
  writeFileSync(filepath, new Uint8Array(arrayBuffer))

  // 获取完整URL路径
  const protocol = c.req.header('x-forwarded-proto') || 'http'
  const host = c.req.header('host') || 'localhost:3002'
  const fullUrl = `${protocol}://${host}/uploads/${filename}`
  console.log('Generated full URL:', fullUrl)

  // 存入数据库
  const image = await prisma.image.create({
    data: {
      filename: file.name,
      path: fullUrl,
    },
  })

  return c.json({
    message: 'File uploaded successfully',
    data: image,
  })
})

// 查询已上传的图片路由
const imagesRoute = createRoute({
  method: 'get',
  path: '/images',
  summary: 'Get All Images',
  description: 'Retrieve all uploaded images',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ImagesResponseSchema,
        },
      },
      description: 'List of uploaded images',
    },
  },
})

app.openapi(imagesRoute, async (c) => {
  const images = await prisma.image.findMany({ orderBy: { id: 'desc' } })
  return c.json(images)
})

// OpenAPI 文档端点
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Hono Upload Demo API',
    description: 'A simple file upload API built with Hono.js',
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server',
    },
  ],
})

// Swagger UI 端点
app.get('/ui', swaggerUI({ url: '/doc' }))

export default app
