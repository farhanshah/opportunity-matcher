// Admin console authentication.
// The operations console uses its own key (ADMIN_SECRET), separate from
// CRON_SECRET, so that knowing the console key does not let anyone trigger
// the scheduled discovery, verification or email jobs, and vice versa.
// Until ADMIN_SECRET is configured the console keeps working with
// CRON_SECRET, so a deployment can never lock the owner out.
import { timingSafeEqual, createHash } from 'node:crypto';

const digest = v => createHash('sha256').update(String(v)).digest();

export function adminSecret(env = process.env) {
  const admin = String(env.ADMIN_SECRET || '').trim();
  return admin || String(env.CRON_SECRET || '').trim();
}

export function adminAuthorised(req, env = process.env) {
  const secret = adminSecret(env);
  if (!secret) return false;
  const header = String(req?.headers?.authorization || '');
  if (!header.startsWith('Bearer ')) return false;
  // Constant-time comparison of fixed-length digests.
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
