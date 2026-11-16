import { timingSafeEqual } from 'node:crypto';

// Keep operations-console access separate from the scheduling credential.
// Fail closed until ADMIN_SECRET is configured with a strong independent value.
export function authorisedAdmin(req) {
  const secret = process.env.ADMIN_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return false;
  const supplied = Buffer.from(String(req?.headers?.authorization || ''), 'utf8');
  const expected = Buffer.from('Bearer ' + secret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
