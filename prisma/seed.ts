import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子数据...')

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理员',
      password: hashedPassword,
    },
  })

  console.log('✅ 创建管理员用户:', adminUser.email)

  // 创建示例简历模板数据
  const templates = [
    {
      name: 'classic',
      displayName: '经典模板',
      description: '简洁专业的经典简历模板',
    },
    {
      name: 'modern',
      displayName: '现代模板',
      description: '时尚现代的简历模板',
    },
    {
      name: 'creative',
      displayName: '创意模板',
      description: '富有创意的简历模板',
    },
  ]

  for (const template of templates) {
    console.log(`📄 创建模板: ${template.displayName}`)
  }

  console.log('🎉 数据库种子数据完成!')
}

main()
  .catch((e) => {
    console.error('❌ 种子数据失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
