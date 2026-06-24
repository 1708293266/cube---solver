# 魔方求解器部署说明

这个项目已经可以作为静态网站部署。部署完成后，别人打开 HTTPS 网址即可直接使用；手机浏览器也可以把它添加到主屏幕，像应用一样打开。

## 推荐方式：GitHub Pages

这个仓库已经包含 `.github/workflows/pages.yml`。推送到 GitHub 的 `main` 或 `master` 分支后，GitHub Actions 会自动构建并发布。

如果仓库地址是：

```text
https://github.com/1708293266/cube---solver
```

发布后的访问地址通常是：

```text
https://1708293266.github.io/cube---solver/
```

如果仓库名不是 `cube---solver`，需要同步修改 `.github/workflows/pages.yml` 里的：

```yaml
VITE_BASE: /cube---solver/
```

## 备用方式：Vercel

1. 进入项目目录：

```powershell
cd C:\Users\Lenovo\Desktop\魔方
```

2. 构建确认：

```powershell
npm.cmd run build
```

3. 使用 Vercel 部署：

```powershell
npx vercel --prod
```

首次使用时需要登录 Vercel，并按提示选择项目。部署成功后会得到一个 `https://...vercel.app` 的公网网址。

## 备用方式：Netlify

也可以把项目连接到 Netlify。配置已经写在 `netlify.toml` 中：

- Build command: `npm run build`
- Publish directory: `dist`

部署成功后会得到一个 `https://...netlify.app` 的公网网址。

## 注意

PWA 的安装和离线能力需要 HTTPS。`localhost` 可以测试，真正给别人使用时必须部署到 HTTPS 域名。
