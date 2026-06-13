# Local Deployment

This project includes one-click local deployment scripts for macOS and Windows.

The local version builds the React frontend and runs the Cloudflare Worker locally. The app is served at:

```text
http://127.0.0.1:8788
```

Both scripts rebuild the current frontend and run the current Worker code every time, so macOS and Windows local versions pick up the latest repository updates automatically.

## Requirements

- Node.js 22 or newer
- npm

## macOS

Run:

```bash
./local/macos/start-tarot-helper.command
```

You can also double-click `local/macos/start-tarot-helper.command` in Finder.

## Windows

Double-click:

```text
local\windows\start-tarot-helper.bat
```

Or run in Command Prompt:

```bat
local\windows\start-tarot-helper.bat
```

## DeepSeek API Key

On first run, the script creates:

```text
worker/.dev.vars
```

Edit it and set:

```text
DEEPSEEK_API_KEY=your_deepseek_api_key
```

Without the key, the app still opens and supports card drawing, card meanings, and statistics. AI reading generation will show a clear missing-key error.

## What The Scripts Do

1. Install frontend dependencies with `npm ci`.
2. Run frontend tests with `npm test`.
3. Build the frontend with `npm run build`.
4. Install Worker dependencies with `npm ci`.
5. Create `worker/.dev.vars` from `worker/.dev.vars.example` if needed.
6. Start local Worker preview with:

```bash
npx wrangler dev --ip 127.0.0.1 --port 8788
```

Current local app behavior includes the two-stage basic spread draw flow, AI generation timing hints, and post-generation timing statistics for 5-card and 10-card readings.

## Stop The App

Press `Ctrl+C` in the terminal window.
