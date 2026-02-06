# yt-looper

A React + TypeScript app for creating and replaying custom loop segments from YouTube videos.

## Features

- Load a YouTube URL or video ID.
- Create named loop segments using timestamp inputs or mark buttons.
- Jump between saved segments and control playback speed.
- Share links with saved loop segments encoded in the URL.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Deploying to Cloudflare Workers

The project includes a Worker (`worker/index.ts`) and Wrangler config (`wrangler.toml`) that serve the Vite build output.

1. Authenticate once: `npx wrangler login`
2. Build the app: `npm run build`
3. Deploy: `npx wrangler deploy`

Useful commands:

- Local worker runtime: `npx wrangler dev`
- Production logs: `npx wrangler tail`
