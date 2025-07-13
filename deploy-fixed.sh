#!/bin/bash

# 简历制作网站快速部署脚本 - 修复版本
# 使用方法: ./deploy-fixed.sh

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
    echo "🚀 简历制作网站 - 生产环境部署 (修复版)"
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
    
    print_success "系统依赖检查完成"
}

# 准备环境配置
prepare_environment() {
    print_info "准备生产环境配置..."
    
    # 创建正确的环境变量文件
    cat > .env.production << 'EOF'
# 生产环境配置文件
DATABASE_URL="postgresql://postgres:li123123@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres"
JWT_SECRET="PFpfig8B7dPO+O3P+KdGjwm4Sa4aQba/KyZglQW/tz8ieSGeVjXqbf3/qUA7Ym6A1TtP+DBqEgtRUJE5o0zlEw=="
NODE_ENV=production
PORT=3004
CORS_ORIGIN="https://llfzxx.com"
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-change-this-in-production"
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
LOG_LEVEL=info
EOF
    
    print_success "环境配置文件已创建"
    
    # 安全加载环境变量
    print_info "加载环境变量..."
    export DATABASE_URL="postgresql://postgres:li123123@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres"
    export JWT_SECRET="PFpfig8B7dPO+O3P+KdGjwm4Sa4aQba/KyZglQW/tz8ieSGeVjXqbf3/qUA7Ym6A1TtP+DBqEgtRUJE5o0zlEw=="
    export NODE_ENV=production
    export PORT=3004
    export CORS_ORIGIN="https://llfzxx.com"
    
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
    
    # 安装生产依赖
    npm ci --only=production
    
    print_success "依赖安装完成"
}

# 数据库迁移
migrate_database() {
    print_info "执行数据库迁移..."
    
    # 检查数据库连接
    print_info "检查数据库连接..."
    
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

# 创建启动脚本
create_startup_script() {
    print_info "创建启动脚本..."
    
    cat > start-production.sh << 'EOF'
#!/bin/bash
# 生产环境启动脚本

# 设置环境变量
export DATABASE_URL="postgresql://postgres:li123123@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres"
export JWT_SECRET="PFpfig8B7dPO+O3P+KdGjwm4Sa4aQba/KyZglQW/tz8ieSGeVjXqbf3/qUA7Ym6A1TtP+DBqEgtRUJE5o0zlEw=="
export NODE_ENV=production
export PORT=3004
export CORS_ORIGIN="https://llfzxx.com"

# 启动应用
echo "🚀 启动简历制作网站..."
echo "📅 启动时间: $(date)"
echo "🌐 服务地址: http://localhost:${PORT}"
echo "📊 健康检查: http://localhost:${PORT}/health"
echo "=================================================="

npm start
EOF
    
    chmod +x start-production.sh
    print_success "启动脚本已创建: ./start-production.sh"
}

# 创建PM2配置
create_pm2_config() {
    print_info "创建PM2配置..."
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'resume-app',
    script: 'src/server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3004,
      DATABASE_URL: 'postgresql://postgres:li123123@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres',
      JWT_SECRET: 'PFpfig8B7dPO+O3P+KdGjwm4Sa4aQba/KyZglQW/tz8ieSGeVjXqbf3/qUA7Ym6A1TtP+DBqEgtRUJE5o0zlEw==',
      CORS_ORIGIN: 'https://llfzxx.com'
    }
  }]
}
EOF
    
    print_success "PM2配置已创建: ./ecosystem.config.js"
}

# 显示部署信息
show_deployment_info() {
    print_success "🎉 部署完成！"
    echo ""
    echo "=================================================="
    echo "📊 部署信息"
    echo "=================================================="
    echo "🌐 服务地址: http://localhost:3004"
    echo "📊 健康检查: http://localhost:3004/health"
    echo "📚 API文档: http://localhost:3004/api/ui"
    echo "🗄️  数据库: Supabase PostgreSQL"
    echo "🔐 CORS域名: https://llfzxx.com"
    echo "=================================================="
    echo ""
    echo "🚀 启动方式:"
    echo "   方式1: ./start-production.sh"
    echo "   方式2: npm start"
    echo "   方式3: pm2 start ecosystem.config.js"
    echo ""
    echo "🔍 监控命令:"
    echo "   curl http://localhost:3004/health"
    echo ""
    echo "📝 PM2管理:"
    echo "   pm2 start ecosystem.config.js  # 启动"
    echo "   pm2 status                     # 状态"
    echo "   pm2 logs resume-app            # 日志"
    echo "   pm2 restart resume-app         # 重启"
    echo "   pm2 stop resume-app            # 停止"
    echo ""
    print_warning "请确保防火墙已开放端口 3004"
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
    create_startup_script
    create_pm2_config
    show_deployment_info
    
    print_success "✨ 部署脚本执行完成！"
}

# 错误处理
trap 'print_error "部署过程中发生错误，请检查上面的错误信息"; exit 1' ERR

# 执行主流程
main

echo ""
echo "🎊 恭喜！你的简历制作网站已准备就绪！"
