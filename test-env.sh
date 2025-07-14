#!/bin/bash

# 测试环境变量脚本

echo "🔍 测试环境变量配置..."

# 直接设置环境变量
export DATABASE_URL="postgresql://postgres:VxZFAfJuPD2RzDT2@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres"
export JWT_SECRET="PFpfig8B7dPO+O3P+KdGjwm4Sa4aQba/KyZglQW/tz8ieSGeVjXqbf3/qUA7Ym6A1TtP+DBqEgtRUJE5o0zlEw=="
export NODE_ENV=production
export PORT=3004
export CORS_ORIGIN="https://llfzxx.com"

echo "✅ 环境变量已设置"
echo "📊 配置信息:"
echo "   数据库: ${DATABASE_URL%@*}@***"
echo "   JWT密钥: ${JWT_SECRET:0:20}..."
echo "   环境: $NODE_ENV"
echo "   端口: $PORT"
echo "   CORS: $CORS_ORIGIN"

# 测试数据库连接
echo ""
echo "🔍 测试数据库连接..."
if npx prisma db pull --force &> /dev/null; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

echo ""
echo "🎉 环境配置测试完成！"
