<div align="center">

# ⚽ GoalForge AI

**The one-click football content engine.** Generate original, viral short-form
football videos for TikTok, Instagram Reels & YouTube Shorts — scripts, scenes,
captions, hashtags, thumbnails and a rendered vertical MP4 — from a single prompt.

</div>

---

## ✨ What it does

Pick a template (Match Predictions, Top 10 Players, Football Facts, Transfer News,
Tactical Analysis, Best Goals, Player Spotlight, Historic Moments, Quiz, Rankings),
add a topic, and GoalForge generates a complete, **editable** content package:

- Viral hook · full script · scene breakdown
- Animated on-screen captions · thumbnail text · call-to-action
- Video title · TikTok / Instagram / YouTube descriptions · 15–20 hashtags
- A rendered **1080×1920, 60 FPS** vertical MP4 with your branding, watermark and a thumbnail

The video engine (FFmpeg) composes an animated gradient background, per-scene caption
cards, stat chips, brand accent bars, a live progress bar and a watermark — no editing
software required.

## 🧱 Tech stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React · TypeScript · Vite · Tailwind CSS · Framer Motion · GSAP · Recharts |
| Backend   | Node.js · Express · TypeScript |
| Database  | SQLite (local) · PostgreSQL (production) via Prisma |
| Auth      | JWT |
| AI        | OpenAI (optional) with a deterministic offline fallback |
| Video     | FFmpeg (`@ffmpeg-installer/ffmpeg`, no system install needed) |
| Storage   | Local disk behind a swappable `StorageDriver` (cloud-ready) |
| Deploy    | Render (web service + PostgreSQL) |

## 📁 Structure

```
GoalForge/
├── server/            # Express API, Prisma, AI + FFmpeg pipeline
│   ├── src/
│   │   ├── routes/    # auth, ai, videos, templates, prompts, brand, exports, analytics, admin
│   │   ├── services/  # openai, content, video (ffmpeg), render queue, storage
│   │   ├── data/      # curated football data, templates, prompts (free, offline)
│   │   └── ...
│   ├── prisma/        # schema + seed
│   └── assets/fonts/  # bundled fonts for portable rendering
├── client/            # React app (landing, auth, dashboard, admin)
│   └── src/
│       ├── pages/     # Landing, Login, Register, dashboard/*
│       ├── components/# ui kit, landing sections, dashboard widgets
│       └── lib/       # api client, types, utils
├── render.yaml        # Render blueprint (IaC)
└── package.json       # npm workspaces (server + client)
```

## 🚀 Local development

Requires Node ≥ 20 (22 recommended).

```bash
# 1. Install everything (root, server, client)
npm install

# 2. Configure the server env
cp .env.example server/.env      # then edit if you like

# 3. Create the SQLite DB + seed templates, prompts and demo users
npm run prisma:migrate --workspace server   # or: npm run db:push --workspace server
npm run prisma:seed

# 4. Run API (:4000) and client (:5173) together
npm run dev
```

Open http://localhost:5173.

**Demo accounts** (from the seed):

| Role  | Email                  | Password       |
|-------|------------------------|----------------|
| Admin | `admin@goalforge.ai`   | `goalforge123` |
| User  | `demo@goalforge.ai`    | `demo1234`     |

> The `OPENAI_API_KEY` in `server/.env` is optional — leave it blank and GoalForge
> uses a built-in, deterministic generator grounded in curated football data so the
> whole app (including video rendering) works end-to-end for free.

### Useful scripts

```bash
npm run build          # build server + client
npm run typecheck      # typecheck both packages
npm run lint           # eslint both packages
npm run test           # run server + client tests
```

## ☁️ Deploying to Render

The app deploys as a **single Render Web Service** (the Express server serves the
built React client) plus a **PostgreSQL** instance. You can deploy via the
`render.yaml` blueprint, or configure a service manually with these settings:

| Setting            | Value |
|--------------------|-------|
| **Runtime**        | Node |
| **Build Command**  | `npm ci --include=dev && npm run build` |
| **Start Command**  | `npm run start` |
| **Health Check**   | `/api/health` |

### Required environment variables

| Key                 | Value / source |
|---------------------|----------------|
| `NODE_ENV`          | `production` |
| `DATABASE_URL`      | your Render PostgreSQL **Internal Connection String** |
| `DATABASE_PROVIDER` | `postgresql` |
| `JWT_SECRET`        | a long random string |
| `OPENAI_API_KEY`    | your OpenAI key (optional but recommended) |
| `OPENAI_MODEL`      | `gpt-4o-mini` (default) |
| `NODE_VERSION`      | `22` |

### Why these exact commands?

- **`npm ci --include=dev`** — Render sets `NODE_ENV=production`, which makes a plain
  `npm install` skip `devDependencies`. The build needs `typescript`, `vite` and the
  `prisma` CLI (all dev deps), so `--include=dev` forces them in for the build.
- **`npm run build`** runs `prisma generate` (with the Postgres provider — see below),
  compiles the server (`tsc`) and builds the client (`vite build`).
- **`npm run start`** runs `set-db-provider.mjs` → `prisma db push` (creates/syncs the
  Postgres tables on boot — **no manual migration step needed**) → `node dist/index.js`.

### One schema, two databases

`server/prisma/schema.prisma` is committed with the `sqlite` provider for local dev.
At build/start time, `server/scripts/set-db-provider.mjs` rewrites the datasource
provider to `postgresql` whenever `DATABASE_PROVIDER=postgresql` or `DATABASE_URL`
points at Postgres. All models use portable column types (JSON is stored as text), so
the same schema serves both engines with no edits.

### First deploy checklist

1. Create the PostgreSQL database in Render.
2. Create the Web Service from this repo with the Build/Start commands above.
3. Add the environment variables from the table.
4. Deploy. On first boot, `prisma db push` creates the tables automatically.
5. (Optional) To seed templates/prompts/admin in production, run
   `npm run prisma:seed --workspace server` from the Render Shell.

> **Note:** the built-in templates and system prompts are also self-healing —
> the admin seed is the only way to create the admin user, so run the seed once
> (step 5) if you want the pre-made admin login in production. Otherwise just
> register a new account (the first registered user can be promoted to admin by
> updating its `role` to `ADMIN`).

## 🎬 The video engine

`server/src/services/video.service.ts` builds a single FFmpeg filtergraph:

- an **animated radial-glow gradient** (`geq`, brand-coloured, drifting) scaled up smoothly,
- brand **accent bars**, per-scene **heading + caption cards** with fade in/out and pop motion,
- optional **stat chips**, a **live progress bar** and a **watermark**,
- encoded to `libx264 / yuv420p / +faststart` at **1080×1920, 60 FPS**.

A dedicated thumbnail frame is rendered per video. Renders run through a small
in-process, sequential queue (`render.service.ts`) — swappable for a dedicated worker
later without changing callers. Fonts are bundled in `server/assets/fonts` so rendering
is portable (no system fonts required).

## 🔌 Extensibility

- **Storage** — implement `StorageDriver` (see `services/storage/types.ts`) for S3/GCS.
- **Data** — `data/football.ts` is a drop-in seam for a live football data API.
- **AI** — `services/openai.service.ts` isolates the model; swap or add providers freely.

## 📄 License

MIT.
