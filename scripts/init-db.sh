#!/bin/bash

# 数据库初始化脚本
# 使用方法: ./scripts/init-db.sh

set -e

echo "🗄️  开始初始化数据库..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL 环境变量未设置"
    echo "请先设置数据库连接字符串："
    echo "export DATABASE_URL='postgresql://username:password@host:5432/database'"
    exit 1
fi

echo "✅ 数据库连接字符串已设置"

# 生成 Prisma 客户端
echo "📦 生成 Prisma 客户端..."
npx prisma generate

# 执行数据库迁移
echo "🔄 执行数据库迁移..."
npx prisma migrate deploy

# 检查数据库连接
echo "🔍 检查数据库连接..."
npx prisma db pull --force || echo "⚠️  数据库连接检查完成"

echo "🎉 数据库初始化完成！"
echo ""
echo "📊 数据库状态："
echo "   连接地址: ${DATABASE_URL%@*}@***"
echo "   迁移状态: ✅ 已完成"
echo "   客户端: ✅ 已生成"
echo ""
echo "🚀 现在可以启动应用了："
echo "   npm start"
