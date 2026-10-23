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
  // Cloudflare R2, for product image uploads. Leave R2_BUCKET empty to turn uploads off;
  // product images can still be set by pasting an image URL.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID?.trim() ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
    bucket: process.env.R2_BUCKET?.trim() ?? '',
    // Public address of the bucket, e.g. https://pub-xxxx.r2.dev or https://images.yourcafe.com
    publicUrl: (process.env.R2_PUBLIC_URL?.trim() ?? '').replace(/\/+$/, ''),
    // Only for testing against a local S3-compatible server; normally derived from the account ID
    endpoint: process.env.R2_ENDPOINT?.trim() ?? '',
    maxImageBytes: 1.5 * 1024 * 1024, // 1.5 MB
  },
  // Bakong KHQR. Leave KHQR_BAKONG_ACCOUNT_ID empty to offer cash only.
  khqr: {
    accountId: process.env.KHQR_BAKONG_ACCOUNT_ID?.trim() ?? '', // e.g. yourname@aclb
    merchantName: process.env.KHQR_MERCHANT_NAME?.trim() || 'Weeee Cafe', // max 25 characters
    merchantCity: process.env.KHQR_MERCHANT_CITY?.trim() || 'Phnom Penh',
    // A QR code can be paid for 120 seconds after it is shown. The automatic payment
    // checks (services/khqrVerification.js) are timed to fit inside this window.
    qrLifetimeSeconds: 120,
    // Bakong Open API token, used to confirm payments automatically. Without it,
    // staff confirm KHQR payments by hand.
    bakongToken: process.env.KHQR_BAKONG_TOKEN?.trim() ?? '',
    bakongApiUrl: process.env.KHQR_BAKONG_API_URL?.trim() || 'https://api-bakong.nbc.gov.kh',
    // Bakong allows 100 requests per day on the current plan
    bakongDailyRequestLimit: Number(process.env.KHQR_BAKONG_DAILY_LIMIT ?? 100),
  },
};

if (config.isProd && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
