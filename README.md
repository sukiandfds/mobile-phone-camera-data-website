# 手机摄像头等效光圈对比网站

这是一个模仿 [socpk.com](https://www.socpk.com/cpucurve/gb6/) 设计的手机摄像头等效光圈对比网站。

## 功能特点

- 📊 交互式等效光圈曲线图表
- 📱 多品牌手机型号展示（小米、三星、苹果等）
- 🎨 现代化黑色主题设计
- 📱 响应式设计，支持移动端
- ⚡ 基于 Next.js 构建，性能优异

## 技术栈

- **框架**: Next.js 15 + TypeScript
- **样式**: Tailwind CSS
- **图表**: Chart.js + react-chartjs-2
- **部署**: Vercel

## 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 自动部署完成

## 数据结构

网站展示的数据包括：
- 手机型号名称
- 发布时间
- 等效光圈范围
- 等效焦段范围

## 自定义数据

可以在 `app/page.tsx` 中的 `phoneData` 对象中修改手机数据，在 `chartData` 中修改图表数据。

## 许可证

MIT License
