
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'

import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

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

    // 存入数据库
    const image = await prisma.image.create({
        data: {
            filename: file.name,
            path: `/uploads/${filename}`,
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
    return c.json(images)
})

export default app
