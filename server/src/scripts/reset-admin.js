// Sets a new password for an existing admin account (and signs that admin out everywhere).
//
//   MONGODB_URI='mongodb+srv://…/weeee-cafe' ADMIN_EMAIL='owner@example.com' npm run reset-admin
//
// The password is typed at a hidden prompt, so the shell never sees it (no quoting or `$`/`!` problems).
// For non-interactive use, set ADMIN_PASSWORD instead.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Admin } from '../models/Admin.js';

function promptHidden(label) {
  process.stdout.write(label);
  return new Promise((resolve) => {
    let value = '';
    const stdin = process.stdin;
    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          done();
          return resolve(value);
        }
        if (ch === '\u0003') {
          done();
          process.exit(130);
        }
        value = ch === '\u007f' || ch === '\b' ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error('Set ADMIN_EMAIL to the account you want to reset.');
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) {
    console.error('No terminal available — set ADMIN_PASSWORD to run non-interactively.');
    process.exit(1);
  }
  password = await promptHidden('New password (hidden): ');
  if (password !== (await promptHidden('Repeat password:     '))) {
    console.error('Passwords did not match. Nothing changed.');
    process.exit(1);
  }
}
if (password.length < 8) {
  console.error('Use at least 8 characters. Nothing changed.');
  process.exit(1);
}

await connectDb();
const admin = await Admin.findOne({ email });
if (!admin) {
  const known = await Admin.find().distinct('email');
  console.error(`No admin with email "${email}" in database "${mongoose.connection.name}". Accounts found: ${known.join(', ') || 'none'}`);
  await mongoose.disconnect();
  process.exit(1);
}

admin.passwordHash = await bcrypt.hash(password, 12);
admin.passwordChangedAt = new Date();
admin.isActive = true;
await admin.save();
console.log(`[reset] password updated for ${admin.email} (${admin.role}) in database "${mongoose.connection.name}"`);
await mongoose.disconnect();
