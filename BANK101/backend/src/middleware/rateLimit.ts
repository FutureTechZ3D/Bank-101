import { Request, Response, NextFunction } from 'express';

/** Small in-memory fixed-window limiter (per client IP). Enough for one server process; use Redis if you scale out. */
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) {
      h = { n: 0, reset: now + opts.windowMs };
      hits.set(key, h);
    }
    h.n += 1;
    if (h.n > opts.max) {
      res.setHeader('Retry-After', Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}
