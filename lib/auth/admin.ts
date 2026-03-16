/**
 * Admin check: user is admin if their email matches ADMIN_EMAIL in env.
 * Set ADMIN_EMAIL in .env.local to the admin account email (from Supabase Auth signup).
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

export function isAdmin(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  if (!ADMIN_EMAIL) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
