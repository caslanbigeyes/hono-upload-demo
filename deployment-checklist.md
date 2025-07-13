# 🚀 简历制作网站上线部署清单

## 1. 数据库迁移 (必须)

### 当前状态
- ✅ 开发环境：SQLite (`file:./dev.db`)
- ❌ 生产环境：需要切换到 PostgreSQL

### 迁移步骤

#### 1.1 准备PostgreSQL数据库
```bash
# 选择云数据库服务商 (推荐)
- Supabase (免费额度，易用)
- PlanetScale (MySQL兼容)
- Railway (PostgreSQL)
- 阿里云RDS
- 腾讯云数据库

# 或自建PostgreSQL
docker run --name postgres-resume \
  -e POSTGRES_DB=resume_db \
  -e POSTGRES_USER=resume_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 -d postgres:15
```

#### 1.2 更新Prisma配置
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 1.3 数据迁移命令
```bash
# 1. 生成新的迁移文件
npx prisma migrate dev --name init_postgresql

# 2. 部署到生产数据库
npx prisma migrate deploy

# 3. 生成Prisma客户端
npx prisma generate
```

## 2. 环境变量配置

### 2.1 生产环境变量 (.env.production)
```env
# 数据库配置
DATABASE_URL="postgresql://username:password@host:5432/resume_db"

# JWT 配置 (必须更换)
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters-long"

# 服务器配置
PORT=3004
NODE_ENV=production

# CORS 配置 (替换为实际域名)
CORS_ORIGIN="https://your-domain.com"

# 安全配置
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-change-this"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# 日志配置
LOG_LEVEL=info
```

## 3. 代码优化

### 3.1 安全加固
- [ ] 更新所有密钥和密码
- [ ] 启用HTTPS
- [ ] 配置安全头部
- [ ] 限制API请求频率
- [ ] 输入验证和SQL注入防护

### 3.2 性能优化
- [ ] 启用Gzip压缩
- [ ] 配置CDN (静态资源)
- [ ] 数据库连接池
- [ ] 缓存策略 (Redis)
- [ ] 图片压缩和优化

## 4. 部署平台选择

### 4.1 推荐平台
1. **Vercel** (推荐)
   - 自动部署
   - 全球CDN
   - 无服务器函数
   - 免费额度充足

2. **Railway**
   - 支持数据库
   - 简单配置
   - 自动扩容

3. **Render**
   - 免费PostgreSQL
   - 自动SSL
   - 持续部署

4. **阿里云/腾讯云**
   - 国内访问快
   - 完整云服务
   - 需要备案

## 5. 部署步骤

### 5.1 Vercel部署 (推荐)
```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录并部署
vercel

# 3. 配置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... 添加所有环境变量

# 4. 重新部署
vercel --prod
```

### 5.2 Docker部署
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3004
CMD ["npm", "start"]
```

## 6. 监控和维护

### 6.1 监控配置
- [ ] 错误监控 (Sentry)
- [ ] 性能监控 (New Relic)
- [ ] 日志聚合 (LogRocket)
- [ ] 健康检查端点

### 6.2 备份策略
- [ ] 数据库自动备份
- [ ] 文件存储备份
- [ ] 配置文件备份

## 7. 域名和SSL

### 7.1 域名配置
- [ ] 购买域名
- [ ] 配置DNS解析
- [ ] 设置CNAME/A记录

### 7.2 SSL证书
- [ ] 自动SSL (Let's Encrypt)
- [ ] 强制HTTPS重定向
- [ ] HSTS配置

## 8. 测试清单

### 8.1 功能测试
- [ ] 用户注册/登录
- [ ] 简历创建/编辑
- [ ] PDF导出功能
- [ ] 文件上传功能
- [ ] 响应式设计

### 8.2 性能测试
- [ ] 页面加载速度
- [ ] API响应时间
- [ ] 并发用户测试
- [ ] 移动端性能

## 9. 上线后检查

### 9.1 立即检查
- [ ] 所有页面正常访问
- [ ] 数据库连接正常
- [ ] 文件上传功能
- [ ] PDF导出功能
- [ ] 邮件发送功能

### 9.2 持续监控
- [ ] 错误率监控
- [ ] 响应时间监控
- [ ] 用户行为分析
- [ ] 服务器资源使用

## 10. 紧急回滚计划

### 10.1 回滚准备
- [ ] 保留上一版本代码
- [ ] 数据库备份
- [ ] 回滚脚本准备
- [ ] 紧急联系方式

---

## 🎯 优先级排序

### 🔴 高优先级 (必须完成)
1. 数据库迁移到PostgreSQL
2. 环境变量配置
3. 基本安全配置
4. 部署到生产环境

### 🟡 中优先级 (建议完成)
1. 监控和日志
2. 性能优化
3. 备份策略
4. 域名和SSL

### 🟢 低优先级 (后续优化)
1. 高级监控
2. 缓存优化
3. CDN配置
4. 自动化测试

---

## 📞 技术支持

如果在部署过程中遇到问题，可以：
1. 检查日志文件
2. 查看数据库连接状态
3. 验证环境变量配置
4. 测试API端点响应
