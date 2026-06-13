# Tarot Reading Assistant

本地运行的塔罗解读辅助网页应用。它支持牌阵选择、手动选牌、一键抽牌、牌义悬停详情、元素统计、动态神秘学视觉背景，并通过本地 Node 后端代理 DeepSeek API 生成结构化解读。

## Features

- 多牌阵支持：基础进阶牌阵、选择牌阵、时间牌阵、恋人金字塔、整体运势牌阵。
- 选牌流程：大阿卡纳 / 小阿卡纳、花色与具体牌、正位 / 逆位。
- 一键抽牌：遵守牌阵指定的大牌 / 小牌规则；未指定时从 78 张牌中不重复随机。
- 牌义详情：悬停或点击牌位时展示关键词、正逆位解释、牌位含义和 AI 牌位解读。
- 全局辅助统计：正逆位比例、四元素比例、主导元素背景染色。
- 神秘学视觉：动态卢恩环、炼金术符号环、占星符号环、元素色牌框和详情面板。
- AI 解读：本地 Express 后端调用 DeepSeek OpenAI-compatible API，避免在前端暴露密钥。

## Tech Stack

- Vite
- React
- TypeScript
- Express
- DeepSeek OpenAI-compatible API
- Node test runner

## Getting Started

```bash
npm install
cp .env.example .env
```

编辑 `.env`，填入你的 DeepSeek API key：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MAX_TOKENS=3200
DEEPSEEK_TIMEOUT_MS=60000
```

启动本地开发环境：

```bash
npm run dev
```

默认地址：

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8787`

如果没有配置 `DEEPSEEK_API_KEY`，应用仍可选牌、抽牌和查看牌义；点击生成解读时会返回清晰错误。

## Scripts

```bash
npm run dev       # 同时启动前端和后端
npm run dev:client
npm run dev:server
npm test          # 运行数据与逻辑测试
npm run build     # TypeScript 检查并构建前端
npm run preview   # 预览构建结果
```

## Project Structure

```text
.
├── server/          # Express API proxy
├── src/
│   ├── data/        # Tarot card and spread data
│   ├── lib/         # Drawing, stats, payload helpers
│   ├── App.tsx      # Main UI
│   ├── styles.css   # Visual design
│   └── types.ts
├── tests/           # Node test runner tests
├── .env.example
├── package.json
└── vite.config.ts
```

## Environment And Security

- Do not commit `.env`.
- Put API keys only in local environment variables.
- The frontend calls only the local backend endpoint; it does not embed the DeepSeek key.
- `.env.example` contains placeholders only.

## Notes

The app is intended as an interpretive aid. AI output should be treated as reflective guidance rather than deterministic advice.
