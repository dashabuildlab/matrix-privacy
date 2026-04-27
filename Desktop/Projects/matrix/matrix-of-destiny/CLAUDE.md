# Matrix of Destiny — Claude Instructions

## Working Directory

Always work directly in this project directory. **Never create worktrees.** All edits must happen in `C:\Users\dell\Desktop\Projects\matrix\matrix-of-destiny`.

## What this project is

A fork of **Matrix of Soul** with Tarot completely removed. Keeps: numerology (Destiny Matrix), AI chat, meditations, learning games (minus Tarot game), daily journal, gamification. App display name: **Matrix of Destiny**.

## Deploy (dedicated destiny slot — isolated from matrix-of-soul production)

- Server IP: `89.167.40.15`
- Server path: `/srv/apps/matrix-of-destiny/`
- Web port: `3006` (seo-website) — free port, different from matrix-of-soul's 3005
- DB: `app_matrix_of_destiny` / user `app_matrix_of_destiny` on `localhost:5432`
- SSH: `ssh -i deploy_key deployer@89.167.40.15` — this key is pinned by `authorized_keys` to `/srv/apps/matrix-of-destiny` only, cannot touch other slots
- Deploy: run `expo-tunnel.bat` from project root. It rsyncs `./` to `/srv/apps/matrix-of-destiny/` then opens expo-tunnel for QR-code testing
- Server auto-runs on rsync: `npm install --legacy-peer-deps` → `npx expo export --platform web` → `docker compose up -d`
- Manual shell on server: `ssh -i deploy_key deployer@89.167.40.15 shell`
- Direct psql: `ssh -i deploy_key deployer@89.167.40.15 psql`

## Credentials (gitignored; rsync'd to server except where noted)

- `.env` — DATABASE_URL, CLAUDE_API_KEY, WEBHOOK_SECRET
- `deploy_key` — SSH private key (local use only)
- `serviceAccountKey.json` — Firebase admin key

## Stack

- Expo 54 + React Native 0.81.5 + React 19.1 + Expo Router
- Zustand (`stores/useAppStore.ts`)
- Firebase Auth (Google / Apple)
- Node.js/Express API in Docker, port 3100 (host network)
- Next.js 14 SEO site on port 3005 (nginx static export)
- Nginx landing on port 3015
- PostgreSQL schema: `app_matrixofsoul` (name kept for continuity)

## Key Rules

- Git branch: `main` only — no feature branches, no worktrees
- Edit files directly in the working directory
- App must remain Tarot-free — do not re-introduce tarot code, tables, routes, screens, strings, assets, or dependencies
