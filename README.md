# Hono Upload Demo with Swagger UI

一个使用 Hono.js 构建的文件上传 API，集成了 Swagger UI 文档界面。

## 功能特性

- 📤 文件上传功能
- 🖼️ 图片列表查看
- 📚 完整的 Swagger UI 文档
- 🗄️ Prisma + SQLite 数据库
- ✅ TypeScript 类型安全
- 🔍 OpenAPI 3.0 规范

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 生成 Prisma 客户端

```bash
npx prisma generate
```

### 3. 启动服务器

#### 启动带 Swagger UI 的服务器（推荐）

```bash
npm run dev:swagger
```

#### 或启动基础服务器

```bash
npm run dev
```

## API 端点

### 基础端点

- **GET /** - API 状态检查
- **POST /upload** - 上传文件
- **GET /images** - 获取所有已上传的图片
- **GET /uploads/{filename}** - 访问上传的文件

### 文档端点

- **GET /doc** - OpenAPI JSON 规范
- **GET /ui** - Swagger UI 界面

## 使用方式

### 1. 通过 Swagger UI（推荐）

1. 启动服务器：`npm run dev:swagger`
2. 打开浏览器访问：http://localhost:3002/ui
3. 在 Swagger UI 中测试所有 API 端点

### 2. 通过测试页面

1. 打开 `test-swagger.html` 文件
2. 使用表单上传文件
3. 点击链接查看 API 文档

### 3. 通过 curl 命令

```bash
# 检查 API 状态
curl http://localhost:3002/

# 上传文件
curl -X POST -F "file=@your-image.jpg" http://localhost:3002/upload

# 查看所有图片
curl http://localhost:3002/images

# 查看 OpenAPI 文档
curl http://localhost:3002/doc
```

## 项目结构

```
├── index.ts                 # 基础 API（无文档）
├── index-with-swagger.ts    # 带 Swagger 的 API
├── server-node.ts          # Node.js 服务器（基础版）
├── server-swagger.ts       # Node.js 服务器（Swagger 版）
├── start-swagger.js        # 启动脚本
├── test.html              # 基础测试页面
├── test-swagger.html      # Swagger 测试页面
├── prisma/
│   ├── schema.prisma      # 数据库模式
│   └── dev.db            # SQLite 数据库
└── uploads/              # 上传文件目录
```

## 技术栈

- **框架**: Hono.js
- **运行时**: Node.js (通过 tsx)
- **数据库**: SQLite + Prisma
- **文档**: Swagger UI + OpenAPI 3.0
- **验证**: Zod
- **类型**: TypeScript

## 开发说明

- 服务器运行在端口 3002（Swagger 版本）或 3001（基础版本）
- 上传的文件保存在 `./uploads/` 目录
- 数据库信息存储在 SQLite 文件中
- 支持所有常见的图片格式

## API 文档

完整的 API 文档可以通过以下方式查看：

1. **Swagger UI**: http://localhost:3002/ui
2. **OpenAPI JSON**: http://localhost:3002/doc

Swagger UI 提供了交互式的 API 测试界面，你可以直接在浏览器中测试所有的 API 端点。
