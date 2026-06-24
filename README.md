# 魔方求解器

一个基于 React、Three.js 和 Kociemba 算法的 3D 魔方求解器。支持手动旋转、随机打乱、二维展开图颜色输入、自动求解、逐步执行和 PWA 安装。

## 功能

- 3D 魔方实时渲染和触摸/鼠标视角控制
- 二维展开图输入魔方颜色
- Kociemba 算法自动求解
- 简单状态优先生成短解
- 随机打乱和操作历史
- 支持手机浏览器和 PWA 安装
- 支持 GitHub Pages / Vercel / Netlify 静态部署

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物会生成到 `dist` 目录。

## GitHub Pages

本仓库已经包含 GitHub Actions 部署配置。推送到 `main` 或 `master` 分支后，会自动构建并发布到 GitHub Pages。

如果仓库名不是 `cube---solver`，请修改 `.github/workflows/pages.yml` 里的 `VITE_BASE`：

```yaml
VITE_BASE: /你的仓库名/
```

## 技术栈

- React
- TypeScript
- Vite
- Three.js
- Tailwind CSS
- cubejs

## License

MIT
