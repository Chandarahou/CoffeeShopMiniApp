# Deploying Weeee Cafe

**Setup:** MongoDB Atlas (database) → Render (API + bot) → Cloudflare Pages (Mini App, admin).
Do the steps in this order: each one needs an address from the one before.

Replace the example names below (`weeee-api`, `weeee-miniapp`, `weeee-admin`) with whatever names you pick.

## 0. Before you start

- Push this repo to GitHub (a private repo is fine). Render and Cloudflare deploy from it.
- **Use a separate bot for local development.** Only one process can poll a bot token at a time. If your laptop and Render share the token, they fight, and the live bot goes quiet. Create a second bot in @BotFather for testing and put that token in your local `server/.env`.
- Change the super admin password in `server/src/scripts/seed.js`, or remove that entry, before you seed production.

## 1. Database — MongoDB Atlas

1. Create a free cluster. Pick the Singapore region (AWS `ap-southeast-1`) to be close to Render's Singapore region.
2. **Database Access:** add a database user with a long generated password.
3. **Network Access:** add `0.0.0.0/0` (allow from anywhere). Render's free plan doesn't give you a fixed IP. On a paid plan you can allowlist Render's outbound IPs instead; they're listed in the service's **Connect** menu.
4. **Connect → Drivers:** copy the connection string, and add the database name before the `?`:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/weeee-cafe?retryWrites=true&w=majority`

**Seed it from your laptop** (creates the admin accounts and the sample menu). Use **single quotes** around every value: double quotes let your shell rewrite `$` and `!` inside a password, and you'd end up with a different password than you typed.

```sh
MONGODB_URI='mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/weeee-cafe?retryWrites=true&w=majority' \
SEED_ADMIN_EMAIL='you@yourcafe.com' \
SEED_ADMIN_PASSWORD='a-long-password' \
npm run seed
```

Variables on the command line override `server/.env`, so this writes to Atlas, not your local database.

**Keep the database name in the string** (`/weeee-cafe` before the `?`). Without it, MongoDB silently uses a database called `test`. Use the exact same string on Render, or the seed and the server will look in different places.

**Can't log in? Reset the password.** The seed never overwrites an existing account, so to change a password later use the reset command. It asks for the new password at a hidden prompt, so the shell can't mangle it:

```sh
MONGODB_URI='mongodb+srv://…/weeee-cafe?…' ADMIN_EMAIL='you@yourcafe.com' npm run reset-admin
```

It prints the database it changed. If it says it can't find the email, it lists the accounts that exist.

## 2. API + bot — Render

1. Render dashboard → **New → Blueprint** → choose this repo. Render reads `render.yaml`.
2. Fill in the values it asks for:

   | Variable | Value now |
   | --- | --- |
   | `MONGODB_URI` | The Atlas string from step 1 |
   | `TELEGRAM_BOT_TOKEN` | Your **live** bot's token |
   | `MINI_APP_URL` | Leave empty for now (set in step 4) |
   | `CORS_ORIGINS` | Leave empty for now (set in step 4) |

   `JWT_SECRET` is generated for you. `NODE_ENV=production` is already set, which turns off the dev login.
3. When the deploy finishes, open `https://weeee-api.onrender.com/api/health`. It should show `{"ok":true}`.

The blueprint uses the **free** plan. It sleeps after 15 minutes without traffic: the first request then takes about a minute, and the bot doesn't answer while it sleeps. That's fine for testing. For real customers, change `plan: free` to `plan: starter` in `render.yaml`, or change the plan in the dashboard.

## 3. Frontends — Cloudflare Pages (two projects)

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → this repo. Create one project for each app:

| Setting | Mini App project | Admin project |
| --- | --- | --- |
| Project name | `weeee-miniapp` | `weeee-admin` |
| Framework preset | None | None |
| Root directory | *(leave empty: repo root)* | *(leave empty: repo root)* |
| Build command | `npm run build -w miniapp` | `npm run build -w admin` |
| Build output directory | `miniapp/dist` | `admin/dist` |
| Environment variable | `VITE_API_URL` = `https://weeee-api.onrender.com/api` | same |

Then, in each project's **Settings → Build → Build watch paths**, include `miniapp/*` (or `admin/*`) and `package-lock.json`. Each site then rebuilds only when its own code changes.

Notes:
- `VITE_API_URL` is baked in at build time. If you change it, **retry the deployment** so it takes effect.
- Node 24 comes from `.node-version` in the repo root, and Render uses the same file.
- Page refreshes on routes like `/orders` work without extra config: with no `404.html`, Cloudflare Pages serves `index.html` for unknown paths.
- Security headers come from `miniapp/public/_headers` and `admin/public/_headers`.

## 4. Connect everything

Back in Render → **weeee-api → Environment**:

| Variable | Value |
| --- | --- |
| `MINI_APP_URL` | `https://weeee-miniapp.pages.dev` |
| `CORS_ORIGINS` | `https://weeee-miniapp.pages.dev,https://weeee-admin.pages.dev` |

Save; Render restarts the service. On startup the bot sets its menu button to open the Mini App.

If you later add custom domains, add them to `CORS_ORIGINS` and update `MINI_APP_URL`.

## 5. Smoke test

1. Open `https://weeee-admin.pages.dev`, sign in, and change your password (sidebar → Change password).
2. In Telegram, send `/start` to the live bot and tap **Order Now**.
3. Place an order. You should get a "received" message from the bot.
4. In the admin, confirm the order and mark it ready. You should get the "ready" message.
5. Mark the payment as received and check that the dashboard's sales figures go up.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Admin login says "Invalid email or password" | The account is missing, or the password was altered by shell quoting when seeding. Check the `admins` collection in Atlas, then run `npm run reset-admin` (step 1). Also make sure the database name is the same everywhere. |
| Admin or Mini App shows "Network error" | `VITE_API_URL` is wrong or wasn't set before the build, or the API is waking from sleep (wait a minute and retry). |
| Browser console shows a CORS error | The site's exact address (with `https://`, no trailing slash) is missing from `CORS_ORIGINS`. |
| Mini App says "Could not verify Telegram data" | `TELEGRAM_BOT_TOKEN` on Render doesn't belong to the bot you opened the app from. |
| Mini App says "Please open … from our Telegram bot" | It was opened in a normal browser. That's expected in production. |
| Bot doesn't answer `/start` | The free instance is asleep, or another process (like your laptop) is polling the same token. Render logs show `retrying in 10s` when there's a conflict. |
| Preview deploys can't reach the API | Preview addresses (`<hash>.weeee-admin.pages.dev`) aren't in `CORS_ORIGINS`. That's intended; test on the production address. |
