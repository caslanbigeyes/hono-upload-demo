#!/bin/bash

# 部署脚本
set -e

echo "🚀 开始部署 Resume API..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ 错误: JWT_SECRET 环境变量未设置"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci --only=production

# 构建应用
echo "🔨 构建应用..."
npm run build

# 生成 Prisma 客户端
echo "🗄️  生成数据库客户端..."
npm run db:generate

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
npm run db:migrate:deploy

# 运行种子数据（可选）
if [ "$RUN_SEED" = "true" ]; then
    echo "🌱 运行种子数据..."
    npm run db:seed
fi

# 启动应用
echo "✅ 部署完成，启动应用..."
npm run start:prod
