#!/bin/bash

# 简历制作网站部署脚本
# 使用方法: ./scripts/deploy.sh [environment]

set -e  # 遇到错误立即退出

ENVIRONMENT=${1:-production}
echo "🚀 开始部署到 $ENVIRONMENT 环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要的工具
check_dependencies() {
    print_message "检查依赖工具..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx 未安装"
        exit 1
    fi
    
    print_message "依赖检查完成"
}

# 安装依赖
install_dependencies() {
    print_message "安装项目依赖..."
    npm ci --only=production
    print_message "依赖安装完成"
}

# 数据库迁移
migrate_database() {
    print_message "执行数据库迁移..."
    
    # 检查环境变量
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL 环境变量未设置"
        exit 1
    fi
    
    # 生成Prisma客户端
    npx prisma generate
    
    # 执行数据库迁移
    npx prisma migrate deploy
    
    print_message "数据库迁移完成"
}

# 构建项目
build_project() {
    print_message "构建项目..."
    
    # 如果有构建脚本则执行
    if npm run build &> /dev/null; then
        print_message "项目构建完成"
    else
        print_warning "没有找到构建脚本，跳过构建步骤"
    fi
}

# 健康检查
health_check() {
    print_message "执行健康检查..."
    
    # 启动服务器进行测试
    timeout 30s npm start &
    SERVER_PID=$!
    
    sleep 5
    
    # 检查服务器是否响应
    if curl -f http://localhost:${PORT:-3004}/health &> /dev/null; then
        print_message "健康检查通过"
        kill $SERVER_PID 2>/dev/null || true
    else
        print_error "健康检查失败"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
}

# 清理旧文件
cleanup() {
    print_message "清理临时文件..."
    
    # 清理日志文件
    find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    # 清理临时上传文件
    find ./uploads -name "temp_*" -type f -mtime +1 -delete 2>/dev/null || true
    
    print_message "清理完成"
}

# 主部署流程
main() {
    echo "🎯 部署环境: $ENVIRONMENT"
    echo "📅 部署时间: $(date)"
    echo "👤 部署用户: $(whoami)"
    echo "📂 工作目录: $(pwd)"
    echo "----------------------------------------"
    
    # 检查环境文件
    if [ ! -f ".env.$ENVIRONMENT" ]; then
        print_error "环境配置文件 .env.$ENVIRONMENT 不存在"
        exit 1
    fi
    
    # 加载环境变量
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
    
    # 执行部署步骤
    check_dependencies
    install_dependencies
    migrate_database
    build_project
    cleanup
    health_check
    
    print_message "🎉 部署完成！"
    echo "----------------------------------------"
    echo "🌐 服务地址: http://localhost:${PORT:-3004}"
    echo "📊 监控面板: http://localhost:${PORT:-3004}/health"
    echo "📝 日志文件: ./logs/app.log"
}

# 错误处理
trap 'print_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主流程
main

echo "✨ 部署脚本执行完成"
