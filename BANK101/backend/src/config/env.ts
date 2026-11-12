import dotenv from 'dotenv';

dotenv.config();

/** The JWT secret MUST come from the environment. No fallback: a known default would make tokens forgeable. */
export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET is not set or is shorter than 16 characters. Set it in backend/.env (see .env.example).');
  }
  if (s === 'bank101_secret_key_jwt_authentication_2026') {
    throw new Error('JWT_SECRET is the old public example value. Generate a new random secret.');
  }
  return s;
}

/** Browser origins allowed to call the API (comma separated). */
export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Dev/test switch: lets a signed-in user switch between Free and Pro (the owner wants to test both tiers). Off by default. */
export function tierToggleEnabled(): boolean {
  return process.env.ENABLE_TIER_TOGGLE === 'true';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function authRateLimitMax(): number {
  const n = Number(process.env.AUTH_RATE_MAX);
  return Number.isInteger(n) && n > 0 ? n : 20;
}
