
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'

import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

const app = new Hono()
const prisma = new PrismaClient()

console.log('📦 Hono app initialized')
console.log('🗄️  Prisma client initialized')

// 根路由
app.get('/', (c) => {
    return c.json({ message: 'Hono Upload Demo API is running!' })
})

// 静态文件访问
app.use('/uploads/*', serveStatic({ root: './' }))

// 上传接口
app.post('/upload', async (c) => {
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

// 查询已上传的图片
app.get('/images', async (c) => {
    const images = await prisma.image.findMany({ orderBy: { id: 'desc' } })
    
    // 确保所有图片都有完整的URL
    const baseUrl = `${c.req.header('host') ? `http://${c.req.header('host')}` : 'http://localhost:3002'}`
    const imagesWithFullUrl = images.map(image => ({
        ...image,
        path: image.path.startsWith('http') ? image.path : `${baseUrl}${image.path}`
    }))
    
    return c.json(imagesWithFullUrl)
})

export default app
