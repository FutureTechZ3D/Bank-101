import './config/env';
import { jwtSecret } from './config/env';
import { checkDb } from './config/db';
import { createApp } from './app';

async function main() {
  jwtSecret(); // fail fast if the secret is missing
  await checkDb(); // fail fast if PostgreSQL is not reachable (no silent mock fallback any more)

  const PORT = Number(process.env.PORT) || 5000;
  createApp().listen(PORT, () => {
    console.log(`BANK-101 Backend API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Cannot start BANK-101 backend:', err.message);
  process.exit(1);
});
