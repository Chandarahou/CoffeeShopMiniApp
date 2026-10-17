# Weeee Cafe

Telegram Mini App for ordering coffee, paid in cash at the counter. MEVN stack. See [project-spec.md](project-spec.md).

| Folder | What | Dev URL |
| --- | --- | --- |
| `server/` | Express API, Mongoose models, Telegram bot (grammY) | http://localhost:4000 |
| `miniapp/` | Customer Mini App (Vue 3, Vite, Tailwind) | http://localhost:5173 |
| `admin/` | Staff dashboard (Vue 3, Vite, Tailwind) | http://localhost:5174 |

## Setup

```sh
npm install
cp server/.env.example server/.env   # set JWT_SECRET (and the bot token / Mini App URL)
mongod                               # or use a MongoDB Atlas URI in MONGODB_URI
npm run seed                         # owner account + sample menu
npm run dev                          # API + Mini App + admin together
```

Admin login: the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `server/.env`. Change the password for any real deployment.

## Trying the Mini App

- **In a browser:** with `ALLOW_DEV_AUTH=true` (non-production only) the Mini App logs in as a fake dev user.
- **In Telegram:** create a bot with @BotFather and set `TELEGRAM_BOT_TOKEN`. Expose the Mini App over HTTPS (e.g. `cloudflared tunnel --url http://localhost:5173`), set `MINI_APP_URL` to that URL and restart the server. Then send `/start` to the bot.

## Documentation

- [docs/TECHNOLOGY.md](docs/TECHNOLOGY.md): how the system works, how the apps and server communicate, and how development differs from production.
- [DEPLOY.md](DEPLOY.md): step-by-step deployment.

## Deploying

See [DEPLOY.md](DEPLOY.md) for the step-by-step guide: MongoDB Atlas, then Render (`render.yaml`), then Cloudflare Pages.

## Design notes

- Money is stored as integer cents. The client sends only product IDs, quantities and choice IDs; the server prices everything.
- Customers are identified by verified Telegram `initData` (HMAC) and keyed on Telegram user ID. Orders keep a snapshot of the customer's identity and of product names, prices and options.
- Order status and payment status are separate. Valid transitions live in `server/src/services/orderWorkflow.js`, and every change is recorded in `order.history`.
- Duplicate submissions are prevented with a client-generated idempotency key (`clientOrderId`).
- Products and categories can be deleted from the admin (orders keep their own snapshot, so history is unaffected). A category that still has products can't be deleted. Unticking *Active* hides an item without deleting it.

## Not built yet

Promo codes and discounts (hook point in `services/pricing.js`, `Promotion` model exists), stock tracking, sales reports, image upload (products take an image URL), Socket.IO real-time updates, and an admin UI for managing staff accounts.
