# Tarot Helper

塔罗解读辅助应用，按以下结构部署：

```text
my-app/
├── frontend/
│   ├── app/
│
├── worker/
│   ├── src/index.js
│   └── wrangler.toml
```

## Architecture

```text
Browser
  ↓
Cloudflare Worker (tarot-helper)
  ├── Static assets (frontend/app/dist)
  └── /api/* routes
  ↓
DeepSeek API
```

单个 Cloudflare Worker 同时托管 React 前端静态资源和 API。`/api/*` 由 Worker 脚本处理，其余请求由静态资源提供，SPA 路由回退到 `index.html`。

## Frontend

前端是 Vite + React + TypeScript。

```bash
cd frontend/app
npm install
npm run dev
```

本地开发时，Vite 会把 `/api` 代理到 `http://127.0.0.1:8788`。前端默认请求同域 `/api/readings`，无需配置 `VITE_API_BASE_URL`。

## Features

- 基础牌阵支持两段式抽牌：先抽 1-5 号主线牌并可立即生成解读，再补抽 6-10 号细节牌后生成完整解读。
- AI 解读以“灵感辅助”为目标，整体总结给出结论性启示，单牌详情结合问题、牌位、正逆位、牌面依据与继续联想。
- 生成中会提示预计耗时；完成后显示本次用时与模型耗时，便于区分 5 张和 10 张牌阵的等待时间。
- 鼠标悬停或点击牌位时，可在详情栏查看牌义、AI 牌位解读、牌面依据和继续联想。

## Local Desktop Deployment

本仓库提供 macOS 和 Windows 本地部署脚本，适合不想手动分别启动前端和 Worker 的场景：

```text
local/macos/start-tarot-helper.command
local/windows/start-tarot-helper.bat
```

脚本会自动安装依赖、运行测试、构建前端，并在本机启动完整应用：

```text
http://127.0.0.1:8788
```

macOS 与 Windows 本地脚本都会在启动时重新构建 `frontend/app` 并运行当前 `worker`，因此仓库更新后再次启动脚本即可获得最新功能。

详细说明见 [LOCAL_DEPLOYMENT.md](LOCAL_DEPLOYMENT.md)。

## Worker

Worker 提供：

- `GET /api/health`
- `POST /api/readings`

本地开发（API only，配合 Vite 代理）：

```bash
cd worker
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入 DEEPSEEK_API_KEY
npm install
npm run dev
```

本地预览完整应用（静态资源 + API）：

```bash
cd frontend/app && npm run build
cd worker && npm install && npm run dev
```

手动部署：

```bash
cd frontend/app && npm run build
cd worker
npm install
npx wrangler secret put DEEPSEEK_API_KEY
npm run deploy
```

## CI/CD

GitHub Actions 工作流位于 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

| Job | 触发条件 | 行为 |
|-----|---------|------|
| `test` | push 到 `main`，或手动触发 | 运行 `frontend/app` 测试 |
| `deploy` | push 到 `main`（测试通过后），或从 `main` 手动触发 | 构建前端 → `wrangler deploy` |

### 一次性配置

**GitHub Secrets**（Settings → Secrets and variables → Actions）：

| Secret | 用途 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | 具有 Edit Cloudflare Workers 权限的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 控制台 → Workers & Pages 侧边栏 |

**DeepSeek API Key**（Cloudflare Worker secret，非 GitHub）：

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
```

Secret 在 Cloudflare 中持久保存，CI 部署不会覆盖它。

### 验证部署

```bash
curl https://tarot-helper.<your-account>.workers.dev/api/health
# → {"ok":true}
```

在浏览器打开 Worker URL，完成一次塔罗解读以确认 SPA 与 API 正常工作。

可选：在 Cloudflare 控制台 → Worker → Triggers → Custom Domains 绑定自定义域名。

## Scripts

```bash
cd frontend/app
npm test
npm run build
```

## Security

- 不要提交 `.env` 或 `.dev.vars`。
- DeepSeek API key 只放在 Cloudflare Worker secret 中。
- 前端不会暴露 DeepSeek API key。

## Notes

AI 解读只作为辅助参考，塔罗结果应作为反思与行动建议，不应被视为确定性结论。
