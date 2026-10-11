import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { formatCents } from '../lib/money.js';

let bot = null;

export async function startBot() {
  if (!config.botToken) {
    console.warn('[bot] TELEGRAM_BOT_TOKEN not set — bot and notifications disabled');
    return;
  }
  bot = new Bot(config.botToken);

  bot.command('start', async (ctx) => {
    const text =
      '☕ Welcome to <b>Weeee Cafe</b>!\n\n' +
      'Tap <b>Order Now</b> to browse the menu and place an order. ' +
      'You pay in cash at the counter when you collect it.';
    const reply_markup = config.miniAppUrl
      ? new InlineKeyboard().webApp('Order Now', config.miniAppUrl)
      : undefined;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup });
  });

  bot.catch((err) => console.error('[bot] update error', err.error));

  if (config.miniAppUrl) {
    await bot.api
      .setChatMenuButton({ menu_button: { type: 'web_app', text: 'Order', web_app: { url: config.miniAppUrl } } })
      .catch((err) => console.warn('[bot] could not set menu button:', err.message));
  }

  if (config.botPolling) poll(true);
}

// During a deploy the old and new instance overlap and Telegram rejects the second poller
// with 409 Conflict. Retry instead of letting the rejection crash the process.
function poll(first = false) {
  bot
    .start({ drop_pending_updates: first, onStart: (me) => console.log(`[bot] @${me.username} polling`) })
    .catch((err) => {
      if (stopping) return;
      console.warn(`[bot] polling stopped (${err.message}); retrying in 10s`);
      setTimeout(() => !stopping && poll(), 10_000);
    });
}

let stopping = false;

export async function stopBot() {
  stopping = true;
  if (bot?.isRunning()) await bot.stop();
}

async function send(telegramUserId, text) {
  if (!bot) return;
  try {
    await bot.api.sendMessage(telegramUserId, text, { parse_mode: 'HTML' });
  } catch (err) {
    // Users who never started the bot can't be messaged; never fail the request over it
    console.warn(`[bot] could not notify ${telegramUserId}:`, err.message);
  }
}

const STATUS_MESSAGES = {
  confirmed: (o) => `✅ Order <b>#${o.orderNumber}</b> has been confirmed.`,
  preparing: (o) => `👩‍🍳 We're preparing order <b>#${o.orderNumber}</b>.`,
  ready: (o) =>
    `🔔 Order <b>#${o.orderNumber}</b> is ready for collection!` +
    (o.paymentStatus === 'unpaid' ? `\nPlease pay <b>${formatCents(o.total)}</b> in cash at the counter.` : ''),
  cancelled: (o) => `❌ Order <b>#${o.orderNumber}</b> has been cancelled. Please contact the counter if this is unexpected.`,
};

export function notifyOrderPlaced(order) {
  return send(
    order.customerSnapshot.telegramUserId,
    `🧾 Order <b>#${order.orderNumber}</b> received!\n` +
      `Total: <b>${formatCents(order.total)}</b>\n` +
      'Please pay in cash at the counter when collecting your order.',
  );
}

export function notifyOrderStatus(order) {
  const message = STATUS_MESSAGES[order.orderStatus];
  if (!message) return;
  return send(order.customerSnapshot.telegramUserId, message(order));
}
