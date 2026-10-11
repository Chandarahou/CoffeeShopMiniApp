import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { verifyInitData } from '../lib/telegramAuth.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { requireAdmin, signAdminToken, signCustomerToken } from '../middleware/auth.js';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

const telegramBody = z.object({
  initData: z.string().max(4096).optional(),
  // DEV ONLY (ALLOW_DEV_AUTH): lets the Mini App run in a normal browser
  devUser: z
    .object({
      id: z.coerce.number().int().positive(),
      username: z.string().optional(),
      first_name: z.string().default('Dev'),
      last_name: z.string().optional(),
    })
    .optional(),
});

authRouter.post('/telegram', async (req, res) => {
  const body = telegramBody.parse(req.body);

  let tgUser;
  if (body.initData) {
    const verified = verifyInitData(body.initData, config.botToken, config.initDataMaxAgeSec);
    if (!verified) throw unauthorized('Could not verify Telegram data');
    tgUser = verified.user;
  } else if (body.devUser && config.allowDevAuth) {
    tgUser = body.devUser;
  } else {
    throw unauthorized('Please open this app from Telegram');
  }

  // Keyed on the Telegram user ID so history survives username changes
  const user = await User.findOneAndUpdate(
    { telegramUserId: String(tgUser.id) },
    {
      $set: {
        telegramUsername: tgUser.username,
        firstName: tgUser.first_name ?? '',
        lastName: tgUser.last_name,
        languageCode: tgUser.language_code,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  res.json({
    token: signCustomerToken(user),
    user: {
      id: user._id,
      telegramUserId: user.telegramUserId,
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

const adminLoginBody = z.object({
  email: z.string().trim().min(1).max(200), // email or username
  password: z.string().min(1).max(200),
});

// Compared against when the account doesn't exist, so response time doesn't reveal valid emails
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

authRouter.post('/admin/login', loginLimiter, async (req, res) => {
  const { email, password } = adminLoginBody.parse(req.body);
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !admin.isActive || !passwordOk) throw unauthorized('Invalid email or password');

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({
    token: signAdminToken(admin),
    admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
  });
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(200),
});

authRouter.post('/admin/change-password', loginLimiter, requireAdmin(), async (req, res) => {
  const { currentPassword, newPassword } = changePasswordBody.parse(req.body);
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) throw unauthorized('Current password is incorrect');
  if (currentPassword === newPassword) throw badRequest('New password must be different from the current one');

  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  admin.passwordChangedAt = new Date();
  await admin.save();

  // Other sessions are now invalid; hand back a fresh token for this one
  res.json({ token: signAdminToken(admin) });
});

authRouter.get('/admin/me', requireAdmin(), (req, res) => {
  const { _id, email, name, role } = req.admin;
  res.json({ id: _id, email, name, role });
});
