# 拾阅 PWA

这是独立的静态网页客户端，不修改 Android 或原生 iOS 工程。通过 HTTPS 打开后，可以安装到 iPhone 主屏幕作为独立网页应用使用。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 4173 --directory read-later-pwa
```

然后打开 `http://localhost:4173/`。使用本地服务器可验证 Service Worker；直接双击 HTML 文件无法启用离线缓存。

## iPhone 安装

1. 在 iPhone 的 Safari 打开部署后的 HTTPS 地址。
2. 点 Safari 的“分享”按钮，再点“添加到主屏幕”。
3. 从主屏幕打开“拾阅”。

## 数据范围

- 收藏清单保存在当前浏览器/主屏幕网页应用的本机存储中。Safari 网页和主屏幕网页应用的存储彼此隔离；分别使用时需要各自添加收藏。
- 当前版本支持手动添加链接、识别常见来源、搜索、按待读/已读筛选、切换已读状态和删除。
- 标题可手动填写；留空时使用网站域名。网页地址不会被发送到服务器；文章正文也不会被抓取。
- 离线时可打开应用壳和本机收藏；打开外部文章仍需要联网。
- 没有登录、跨设备同步、DeepSeek 摘要、推送或可靠定时提醒，也没有 iOS 原生分享扩展。

## GitHub Pages

工作流 `.github/workflows/deploy-pwa.yml` 会把 `read-later-pwa/` 发布到 GitHub Pages。首次启用时，请在仓库 Settings → Pages 中将 Build and deployment 的 Source 设为 GitHub Actions。发布成功后，项目站点地址为：

`https://watermalonskin.github.io/shiyue-android/`
