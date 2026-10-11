function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

// Unset NODE_ENV is treated as production so a forgotten variable can't enable dev-only shortcuts
const env = process.env.NODE_ENV ?? 'production';

export const config = {
  env,
  isProd: env === 'production',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/weeee-cafe',
  jwtSecret: required('JWT_SECRET'),
  customerTokenTtl: '24h',
  adminTokenTtl: '24h',
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  botPolling: process.env.BOT_POLLING !== 'false',
  miniAppUrl: process.env.MINI_APP_URL ?? '',
  // Telegram initData older than this is rejected
  initDataMaxAgeSec: 24 * 60 * 60,
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  shopUtcOffsetMinutes: Number(process.env.SHOP_UTC_OFFSET_MINUTES ?? 0),
  allowDevAuth: process.env.ALLOW_DEV_AUTH === 'true' && env === 'development',
};

if (config.isProd && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
