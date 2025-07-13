#!/bin/bash

# 简历制作网站快速部署脚本
# 使用方法: ./quick-deploy.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "🚀 简历制作网站 - 生产环境部署"
    echo "=================================================="
    echo -e "${NC}"
}

# 检查必要的工具
check_dependencies() {
    print_info "检查系统依赖..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低，需要 18+，当前版本: $(node --version)"
        exit 1
    fi
    
    print_success "系统依赖检查完成"
}

# 准备环境配置
prepare_environment() {
    print_info "准备生产环境配置..."
    
    # 检查 .env.local 是否存在
    if [ ! -f ".env.local" ]; then
        print_error ".env.local 文件不存在，请先配置环境变量"
        exit 1
    fi
    
    # 复制到生产环境配置
    cp .env.local .env.production
    print_success "环境配置文件已准备"
    
    # 加载环境变量
    export $(cat .env.production | grep -v '^#' | xargs)
    
    # 验证关键环境变量
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL 未设置"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET 未设置"
        exit 1
    fi
    
    print_success "环境变量验证通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    
    # 清理旧的依赖
    if [ -d "node_modules" ]; then
        print_info "清理旧的依赖..."
        rm -rf node_modules
    fi
    
    # 安装生产依赖
    npm ci --only=production
    
    print_success "依赖安装完成"
}

# 数据库迁移
migrate_database() {
    print_info "执行数据库迁移..."
    
    # 检查数据库连接
    print_info "检查数据库连接..."
    if ! npx prisma db pull --force &> /dev/null; then
        print_error "数据库连接失败，请检查 DATABASE_URL"
        print_info "当前数据库URL: ${DATABASE_URL%@*}@***"
        exit 1
    fi
    
    # 生成Prisma客户端
    print_info "生成Prisma客户端..."
    npx prisma generate
    
    # 执行数据库迁移
    print_info "执行数据库迁移..."
    npx prisma migrate deploy
    
    print_success "数据库迁移完成"
}

# 构建项目
build_project() {
    print_info "构建项目..."
    
    # 检查是否有构建脚本
    if npm run build &> /dev/null; then
        print_success "项目构建完成"
    else
        print_warning "没有找到构建脚本，跳过构建步骤"
    fi
}

# 健康检查
health_check() {
    print_info "执行健康检查..."
    
    # 启动服务器进行测试
    print_info "启动测试服务器..."
    timeout 30s npm start &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 8
    
    # 检查服务器是否响应
    if curl -f http://localhost:${PORT:-3004}/health &> /dev/null; then
        print_success "健康检查通过"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    else
        print_error "健康检查失败"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        exit 1
    fi
}

# 创建启动脚本
create_startup_script() {
    print_info "创建启动脚本..."
    
    cat > start-production.sh << 'EOF'
#!/bin/bash
# 生产环境启动脚本

# 加载环境变量
export $(cat .env.production | grep -v '^#' | xargs)

# 启动应用
echo "🚀 启动简历制作网站..."
echo "📅 启动时间: $(date)"
echo "🌐 服务地址: http://localhost:${PORT:-3004}"
echo "📊 健康检查: http://localhost:${PORT:-3004}/health"
echo "=================================================="

npm start
EOF
    
    chmod +x start-production.sh
    print_success "启动脚本已创建: ./start-production.sh"
}

# 显示部署信息
show_deployment_info() {
    print_success "🎉 部署完成！"
    echo ""
    echo "=================================================="
    echo "📊 部署信息"
    echo "=================================================="
    echo "🌐 服务地址: http://localhost:${PORT:-3004}"
    echo "📊 健康检查: http://localhost:${PORT:-3004}/health"
    echo "📚 API文档: http://localhost:${PORT:-3004}/api/ui"
    echo "🗄️  数据库: Supabase PostgreSQL"
    echo "🔐 CORS域名: ${CORS_ORIGIN:-未设置}"
    echo "=================================================="
    echo ""
    echo "🚀 启动命令:"
    echo "   ./start-production.sh"
    echo ""
    echo "🔍 监控命令:"
    echo "   curl http://localhost:${PORT:-3004}/health"
    echo ""
    echo "📝 日志查看:"
    echo "   tail -f logs/app.log"
    echo ""
    print_warning "请确保防火墙已开放端口 ${PORT:-3004}"
    print_warning "请配置Nginx反向代理和SSL证书"
}

# 主函数
main() {
    print_header
    
    print_info "开始部署流程..."
    echo "📅 部署时间: $(date)"
    echo "👤 执行用户: $(whoami)"
    echo "📂 工作目录: $(pwd)"
    echo ""
    
    # 执行部署步骤
    check_dependencies
    prepare_environment
    install_dependencies
    migrate_database
    build_project
    health_check
    create_startup_script
    show_deployment_info
    
    print_success "✨ 部署脚本执行完成！"
}

# 错误处理
trap 'print_error "部署过程中发生错误，请检查上面的错误信息"; exit 1' ERR

# 执行主流程
main

echo ""
echo "🎊 恭喜！你的简历制作网站已准备就绪！"
