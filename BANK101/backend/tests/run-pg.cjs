// Runs the whole suite on a REAL PostgreSQL (embedded, no install, no admin rights).
process.env.TEST_DB = 'pg';
const { spawnSync } = require('child_process');
const r = spawnSync(process.execPath, ['--require', 'ts-node/register/transpile-only', '--test', 'tests/**/*.test.ts'], { stdio: 'inherit', env: process.env });
process.exit(r.status === null ? 1 : r.status);
