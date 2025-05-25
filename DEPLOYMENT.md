# 部署指南

## 部署到 Vercel

### 方法一：通过 GitHub（推荐）

1. **创建 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/phone-camera-aperture.git
   git push -u origin main
   ```

2. **连接 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - 点击 "Deploy"

3. **自动部署**
   - Vercel 会自动检测 Next.js 项目
   - 每次推送到 main 分支都会自动重新部署

### 方法二：通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录并部署**
   ```bash
   vercel login
   vercel --prod
   ```

## 环境变量配置

如果需要添加环境变量，在 Vercel 项目设置中添加：

- `NODE_ENV=production`
- 其他自定义环境变量

## 自定义域名

1. 在 Vercel 项目设置中点击 "Domains"
2. 添加你的自定义域名
3. 按照提示配置 DNS 记录

## 性能优化

项目已包含以下优化：

- ✅ 静态生成 (SSG)
- ✅ 图片优化
- ✅ 代码分割
- ✅ 压缩和缓存
- ✅ TypeScript 类型检查

## 监控和分析

Vercel 提供内置的：
- 性能监控
- 错误追踪
- 访问统计
- Core Web Vitals

## 故障排除

### 构建失败
- 检查 TypeScript 错误
- 确保所有依赖都已安装
- 查看构建日志

### 运行时错误
- 检查浏览器控制台
- 查看 Vercel 函数日志
- 确认环境变量配置

## 成本估算

- **Hobby 计划**：免费
  - 100GB 带宽/月
  - 无限静态网站
  - 自动 HTTPS

- **Pro 计划**：$20/月
  - 1TB 带宽/月
  - 优先支持
  - 高级分析 