# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    curl

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 TypeScript (如果有构建脚本)
RUN npm run build 2>/dev/null || echo "No build script found"

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3004

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# 启动应用
CMD ["npm", "start"]
