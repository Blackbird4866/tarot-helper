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
Cloudflare Pages (frontend/app)
  ↓
Cloudflare Workers (worker)
  ↓
DeepSeek API
```

## Frontend

前端是 Vite + React + TypeScript。

```bash
cd frontend/app
npm install
npm run dev
```

Cloudflare Pages 配置：

```text
Root directory: frontend/app
Build command: npm run build
Build output directory: dist
```

如果 Worker 与 Pages 不同域，在 Cloudflare Pages 环境变量里配置：

```text
VITE_API_BASE_URL=https://your-worker.your-account.workers.dev
```

不配置时，前端默认请求同域 `/api/readings`。本地开发时，Vite 会把 `/api` 代理到 `http://127.0.0.1:8787`。

## Worker

Worker 提供：

- `GET /api/health`
- `POST /api/readings`

本地开发：

```bash
cd worker
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入 DEEPSEEK_API_KEY
npx wrangler dev
```

部署：

```bash
cd worker
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy
```

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
