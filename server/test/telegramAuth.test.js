import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyInitData } from '../src/lib/telegramAuth.js';

const BOT_TOKEN = '123456:TEST-TOKEN';

function sign(fields, token = BOT_TOKEN) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

const user = JSON.stringify({ id: 123456789, first_name: 'Dara', username: 'coffee_customer' });
const now = () => String(Math.floor(Date.now() / 1000));

test('accepts correctly signed initData', () => {
  const result = verifyInitData(sign({ user, auth_date: now(), query_id: 'abc' }), BOT_TOKEN, 3600);
  assert.equal(result.user.id, 123456789);
});

test('rejects tampered user data', () => {
  const initData = sign({ user, auth_date: now() }).replace('Dara', 'Evil');
  assert.equal(verifyInitData(initData, BOT_TOKEN, 3600), null);
});

test('rejects data signed with another bot token', () => {
  assert.equal(verifyInitData(sign({ user, auth_date: now() }, '999:OTHER'), BOT_TOKEN, 3600), null);
});

test('rejects stale auth_date', () => {
  const old = String(Math.floor(Date.now() / 1000) - 7200);
  assert.equal(verifyInitData(sign({ user, auth_date: old }), BOT_TOKEN, 3600), null);
});

test('rejects missing hash', () => {
  assert.equal(verifyInitData(`user=${encodeURIComponent(user)}&auth_date=${now()}`, BOT_TOKEN, 3600), null);
});
