import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { Admin } from '../models/Admin.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export function signCustomerToken(user) {
  return jwt.sign({ kind: 'customer' }, config.jwtSecret, {
    subject: String(user._id),
    expiresIn: config.customerTokenTtl,
  });
}

export function signAdminToken(admin) {
  return jwt.sign({ kind: 'admin', role: admin.role }, config.jwtSecret, {
    subject: String(admin._id),
    expiresIn: config.adminTokenTtl,
  });
}

function readToken(req, kind) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Session expired, please sign in again');
  }
  if (payload.kind !== kind) throw unauthorized();
  return payload;
}

export function requireCustomer(req, _res, next) {
  const payload = readToken(req, 'customer');
  req.customerId = payload.sub;
  next();
}

/** Requires a signed-in, active admin. Optionally restrict to specific roles. */
export function requireAdmin(...roles) {
  return async (req, _res, next) => {
    const payload = readToken(req, 'admin');
    // Looked up on every request so deactivating an account takes effect immediately
    const admin = await Admin.findById(payload.sub).lean();
    if (!admin || !admin.isActive) throw unauthorized();
    // Sessions issued before a password change are revoked
    if (admin.passwordChangedAt && payload.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
      throw unauthorized('Session expired, please sign in again');
    }
    if (roles.length && !roles.includes(admin.role)) throw forbidden();
    req.admin = admin;
    next();
  };
}
