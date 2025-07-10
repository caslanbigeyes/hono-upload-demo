import { PrismaClient } from '@prisma/client'

// 创建全局 Prisma 实例
declare global {
  var __prisma: PrismaClient | undefined
}

// 在开发环境中重用 Prisma 实例，避免热重载时创建多个连接
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

export { prisma }

// 数据库连接测试
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// 优雅关闭数据库连接
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  console.log('🔌 Database disconnected')
}
