/**
 * Creates (or promotes) an administrator. Admins can NOT be created through the public API.
 *
 *   ADMIN_USERNAME=owner ADMIN_PASSWORD='a long passphrase' npm run create-admin
 *
 * The password is read from the environment, never from the command line arguments or the repo.
 */
import '../config/env';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in the environment');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  const hash = await bcrypt.hash(password, 12);
  const existing = await query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
  if (existing.rows.length > 0) {
    await query("UPDATE users SET account_type = 'Admin', password_hash = $1 WHERE id = $2", [hash, existing.rows[0].id]);
    console.log(`User '${username}' is now an Admin (password replaced).`);
  } else {
    await query("INSERT INTO users (username, password_hash, account_type, points, streak_days) VALUES ($1, $2, 'Admin', 0, 0)", [username, hash]);
    console.log(`Admin '${username}' created.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
