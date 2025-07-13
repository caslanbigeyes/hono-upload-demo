# 🚀 生产环境部署指南

## 📋 **当前配置状态**

✅ **Supabase数据库**: `db.mirncqxfdobatqhwatbh.supabase.co`  
✅ **JWT密钥**: 已配置  
✅ **前端域名**: `https://llfzxx.com`  
✅ **环境变量**: 已在 `.env.local` 中配置  

---

## 🔧 **部署前修改步骤**

### 1. **创建生产环境配置文件**

```bash
# 复制环境变量到生产配置
cp .env.local .env.production
```

### 2. **更新数据库配置**

确保Prisma使用PostgreSQL：

```bash
# 检查 prisma/schema.prisma 是否已更新为 PostgreSQL
cat prisma/schema.prisma | grep "provider"
# 应该显示: provider = "postgresql"
```

### 3. **执行数据库迁移**

```bash
# 设置环境变量
export DATABASE_URL="postgresql://postgres:li123123@db.mirncqxfdobatqhwatbh.supabase.co:5432/postgres"

# 生成Prisma客户端
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 验证数据库连接
npx prisma db pull
```

### 4. **构建项目**

```bash
# 安装生产依赖
npm ci --only=production

# 构建TypeScript (如果有构建脚本)
npm run build 2>/dev/null || echo "No build script found"
```

---

## 🌐 **部署方案选择**

### **方案一: Docker部署 (推荐)**

#### 步骤1: 准备Docker文件
```bash
# 检查Dockerfile是否存在
ls -la Dockerfile

# 检查docker-compose.yml
ls -la docker-compose.yml
```

#### 步骤2: 构建和部署
```bash
# 构建Docker镜像
docker build -t resume-app .

# 运行容器
docker run -d \
  --name resume-app \
  -p 3004:3004 \
  --env-file .env.production \
  resume-app

# 或使用docker-compose
docker-compose up -d
```

### **方案二: 直接部署到服务器**

#### 步骤1: 上传代码
```bash
# 压缩项目文件 (排除不必要的文件)
tar -czf resume-app.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=*.log \
  --exclude=uploads \
  .

# 上传到服务器
scp resume-app.tar.gz user@your-server:/path/to/app/
```

#### 步骤2: 服务器部署
```bash
# 在服务器上执行
cd /path/to/app/
tar -xzf resume-app.tar.gz

# 安装依赖
npm ci --only=production

# 设置环境变量
cp .env.production .env

# 执行数据库迁移
npx prisma generate
npx prisma migrate deploy

# 启动应用
npm start

# 或使用PM2管理进程
npm install -g pm2
pm2 start src/server.ts --name resume-app
pm2 save
pm2 startup
```

---

## 🔒 **安全配置检查**

### 1. **环境变量安全**
```bash
# 确保敏感信息不在代码中
grep -r "li123123" src/ || echo "✅ 密码未硬编码"
grep -r "PFpfig8B7dPO" src/ || echo "✅ JWT密钥未硬编码"
```

### 2. **CORS配置验证**
```bash
# 检查CORS设置
grep -r "llfzxx.com" src/ || echo "需要在代码中配置CORS"
```

### 3. **防火墙设置**
```bash
# 服务器防火墙配置
sudo ufw allow 3004/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🌍 **Nginx反向代理配置**

创建 `/etc/nginx/sites-available/resume-app`:

```nginx
server {
    listen 80;
    server_name your-api-domain.com;  # 你的API域名

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/resume-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 **部署后验证**

### 1. **健康检查**
```bash
# 检查应用状态
curl http://localhost:3004/health

# 检查API端点
curl http://localhost:3004/api/resumes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. **PDF导出测试**
```bash
# 测试PDF导出功能
curl http://localhost:3004/api/pdf-export \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"resumeId":"test-id","language":"zh-CN"}' \
  --output test.pdf
```

### 3. **数据库连接测试**
```bash
# 测试数据库连接
npx prisma db pull
```

---

## 🚨 **常见问题解决**

### 1. **数据库连接失败**
```bash
# 检查网络连接
ping db.mirncqxfdobatqhwatbh.supabase.co

# 检查端口
telnet db.mirncqxfdobatqhwatbh.supabase.co 5432

# 验证连接字符串
echo $DATABASE_URL
```

### 2. **CORS错误**
```bash
# 检查CORS配置
grep -r "CORS_ORIGIN" .
```

### 3. **端口占用**
```bash
# 检查端口使用
sudo netstat -tlnp | grep 3004
sudo lsof -i :3004
```

---

## 📝 **部署清单**

### 部署前检查
- [ ] `.env.production` 文件已配置
- [ ] 数据库连接字符串正确
- [ ] JWT密钥已设置
- [ ] CORS域名已配置
- [ ] Prisma schema已更新为PostgreSQL

### 部署过程
- [ ] 代码已上传到服务器
- [ ] 依赖已安装
- [ ] 数据库迁移已执行
- [ ] 应用已启动
- [ ] 反向代理已配置

### 部署后验证
- [ ] 健康检查通过
- [ ] API端点正常响应
- [ ] PDF导出功能正常
- [ ] 前端可以正常访问API
- [ ] HTTPS证书已配置

---

## 🎯 **快速部署命令**

```bash
# 一键部署脚本
#!/bin/bash
set -e

echo "🚀 开始部署简历应用..."

# 1. 环境准备
cp .env.local .env.production
export $(cat .env.production | grep -v '^#' | xargs)

# 2. 安装依赖
npm ci --only=production

# 3. 数据库迁移
npx prisma generate
npx prisma migrate deploy

# 4. 启动应用
npm start

echo "✅ 部署完成！"
echo "🌐 应用地址: http://localhost:3004"
echo "📊 健康检查: http://localhost:3004/health"
```

保存为 `deploy.sh` 并执行：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🎉 **部署完成后**

1. **配置域名解析**: 将API域名指向服务器IP
2. **申请SSL证书**: 使用Let's Encrypt或云服务商证书
3. **设置监控**: 配置日志监控和错误告警
4. **备份策略**: 设置数据库自动备份
5. **性能优化**: 配置CDN和缓存策略

**你的简历制作网站即将上线！** 🎊
