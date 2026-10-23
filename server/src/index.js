import mongoose from 'mongoose';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { startBot, stopBot } from './services/bot.js';
import { initKhqr } from './services/khqr.js';
import { initImageStorage } from './services/imageStorage.js';
import { initKhqrVerification, stopKhqrVerification } from './services/khqrVerification.js';

await connectDb();
initImageStorage();
initKhqr();
initKhqrVerification();

const server = createApp().listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  if (config.allowDevAuth) console.warn('[api] ALLOW_DEV_AUTH is on — never enable this in production');
});

await startBot();

async function shutdown() {
  stopKhqrVerification();
  await stopBot();
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
