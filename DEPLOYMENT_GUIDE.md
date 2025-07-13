# 🚀 简历制作网站快速上线指南

## 📋 上线前检查清单

### ✅ 必须完成的工作

#### 1. **数据库迁移** (已完成配置)
- [x] Prisma schema 已更新为 PostgreSQL
- [ ] 创建生产数据库
- [ ] 执行数据库迁移

#### 2. **环境配置** (已准备模板)
- [ ] 复制 `.env.production` 并填写真实配置
- [ ] 生成强密码和密钥
- [ ] 配置数据库连接

#### 3. **部署平台选择**
推荐方案：
- 🥇 **Vercel + Supabase** (最简单)
- 🥈 **Railway** (一站式解决方案)
- 🥉 **Docker + 云服务器** (完全控制)

---

## 🎯 推荐方案：Vercel + Supabase

### 步骤 1: 准备 Supabase 数据库

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 获取数据库连接字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[mirncqxfdobatqhwatbh].supabase.co:5432/postgres
   ```

### 步骤 2: 配置环境变量

创建 `.env.local` 文件：
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters-long"
NODE_ENV=production
PORT=3004
CORS_ORIGIN="https://your-frontend-domain.vercel.app"
```

### 步骤 3: 数据库迁移

```bash
# 1. 安装依赖
npm install

# 2. 生成 Prisma 客户端
npx prisma generate

# 3. 执行数据库迁移
npx prisma migrate deploy

# 4. (可选) 填充测试数据
npx prisma db seed
```

### 步骤 4: Vercel 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 配置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add CORS_ORIGIN

# 5. 重新部署
vercel --prod
```

---

## 🐳 Docker 部署方案

### 快速启动

```bash
# 1. 复制环境变量文件
cp .env.production .env

# 2. 修改 .env 文件中的配置

# 3. 启动所有服务
docker-compose up -d

# 4. 执行数据库迁移
docker-compose exec app npx prisma migrate deploy

# 5. 检查服务状态
docker-compose ps
```

### 访问地址
- 应用: http://localhost:3004
- 健康检查: http://localhost:3004/health
- API 文档: http://localhost:3004/api/ui

---

## 🔧 生产环境优化

### 1. 安全配置

```bash
# 生成强密码
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 24  # SESSION_SECRET
```

### 2. 性能优化

在 `package.json` 中添加：
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/server.js",
    "build": "tsc",
    "postinstall": "prisma generate"
  }
}
```

### 3. 监控配置

添加错误监控 (Sentry):
```bash
npm install @sentry/node
```

---

## 📊 上线后检查

### 立即检查
- [ ] 网站可以正常访问
- [ ] 用户注册/登录功能
- [ ] 简历创建/编辑功能
- [ ] PDF 导出功能
- [ ] 文件上传功能

### 性能检查
- [ ] 页面加载时间 < 3秒
- [ ] API 响应时间 < 500ms
- [ ] 移动端适配正常

### 安全检查
- [ ] HTTPS 证书有效
- [ ] 敏感信息不在前端暴露
- [ ] API 接口有适当的权限控制

---

## 🆘 常见问题解决

### 数据库连接失败
```bash
# 检查连接字符串格式
echo $DATABASE_URL

# 测试数据库连接
npx prisma db pull
```

### 构建失败
```bash
# 清理缓存
npm run clean
rm -rf node_modules package-lock.json
npm install

# 重新生成 Prisma 客户端
npx prisma generate
```

### 环境变量问题
```bash
# 检查环境变量
printenv | grep -E "(DATABASE_URL|JWT_SECRET|NODE_ENV)"

# Vercel 环境变量
vercel env ls
```

---

## 📞 技术支持

### 日志查看
```bash
# Docker 日志
docker-compose logs app

# Vercel 日志
vercel logs

# 本地日志
tail -f logs/app.log
```

### 健康检查
```bash
# 检查服务状态
curl http://localhost:3004/health

# 检查数据库
curl http://localhost:3004/api/resumes
```

---

## 🎉 恭喜！

如果所有检查都通过，你的简历制作网站就成功上线了！

### 下一步建议：
1. 配置域名和 SSL 证书
2. 设置监控和告警
3. 准备备份策略
4. 制定运维计划

### 推广准备：
1. 准备用户手册
2. 设置分析工具 (Google Analytics)
3. 准备客服支持
4. 制定营销策略
