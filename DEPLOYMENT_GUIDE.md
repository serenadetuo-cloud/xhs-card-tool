# 小红书卡片排版工具 - 部署指南

## 部署方案：Render.com（全栈支持，有免费额度）

---

## 第一步：准备 GitHub 仓库

Render 需要从 GitHub 拉取代码，所以先把项目推到 GitHub。

### 1. 在 GitHub 新建仓库
- 打开 [github.com/new](https://github.com/new)
- 仓库名填 `xhs-card-tool`
- 选择 **Public**（私有也可以，Render 免费版支持私有仓库）
- 不要勾选 "Initialize with README"（保持空仓库）

### 2. 把代码推送到 GitHub

打开终端，运行以下命令（把 `你的用户名` 替换成实际的 GitHub 用户名）：

```bash
cd /Users/faye/WorkBuddy/2026-06-30-21-35-53/xhs-card-tool
git init
git add .
git commit -m "初始提交"
git remote add origin https://github.com/你的用户名/xhs-card-tool.git
git push -u origin main
```

> 如果提示没有 git，先运行：`git init && git config user.email "你的邮箱" && git config user.name "你的用户名"`

---

## 第二步：部署到 Render

### 1. 注册/登录 Render
打开 [render.com](https://render.com)，用 GitHub 账号登录（推荐）。

### 2. 新建 Web Service
1. 点击 Dashboard 中的 **"New +"** 按钮
2. 选择 **"Web Service"**
3. 连接你的 GitHub 账号，选择 `xhs-card-tool` 仓库

### 3. 填写配置（Render 会自动读取 `render.yaml`，但建议核对一下）

| 字段 | 值 |
|------|-----|
| Name | `xhs-card-tool`（可自定义） |
| Environment | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Plan | `Free`（免费版，15分钟无访问会休眠） |

### 4. 设置环境变量

在 "Environment Variables" 区域，添加：

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `production` | 固定值 |
| `GEMINI_API_KEY` | 你的 Gemini API Key | 必填，从 [Google AI Studio](https://aistudio.google.com/apikey) 免费获取 |

### 5. 点击 "Create Web Service"

等待 3-5 分钟，构建完成后 Render 会给你一个免费域名，类似：
```
https://xhs-card-tool.onrender.com
```

打开这个链接就能用了！

---

## 免费额度说明

| 项目 | Render 免费版 |
|------|---------------|
| 月流量 | 100GB |
| 休眠策略 | 15分钟无访问自动休眠，下次访问需等待 30-60 秒唤醒 |
| 构建时间 | 每月 500 分钟免费 |
| 自定义域名 | 支持（需自行购买域名） |

---

## 常见问题

### Q：Gemini API Key 哪里获取？
A：打开 [Google AI Studio](https://aistudio.google.com/apikey)，点击 "Create API Key"，免费获取。

### Q：国内访问 Render 慢怎么办？
A：Render 的服务器在国外，国内访问可能较慢。如果追求国内访问速度，可以考虑：
- 部署到 **阿里云/腾讯云**（需要自己的服务器）
- 使用 **Vercel + Supabase** 方案（需要改代码）

### Q：AI 功能为什么用不了？
A：检查 `GEMINI_API_KEY` 环境变量是否设置正确。也可以在网页的 "AI 模型配置" 面板中手动填写 API Key（会覆盖服务端配置）。

---

## 备选方案：Docker 部署

如果你有自己的服务器（阿里云/腾讯云/aws），可以用项目根目录的 `Dockerfile` 构建镜像部署：

```bash
docker build -t xhs-card-tool .
docker run -p 3000:3000 -e GEMINI_API_KEY=你的Key xhs-card-tool
```
