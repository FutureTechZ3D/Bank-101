# BANK101 frontend end-to-end test

Real Chromium (Playwright 1.64.1, existing browser cache) -> real Vite frontend -> real Express backend app ->
pg-mem database loaded with the project's REAL `schema.sql`, `seed.sql` and `migrations/001_hardening.sql`.
Everything goes through the UI. Network doubles in exactly two places, both labelled in the code: group F (an empty quiz, the seed has none any more) and group H (an answer rejected because time is over).

```
# terminal 1 (fresh database every start; the run adds users/quizzes, so restart between runs)
cd backend  && npm run dev:test-server                       # http://127.0.0.1:5000, ENABLE_TIER_TOGGLE=true
# terminal 2 (the Free/Pro test switch needs the build flag)
cd frontend && set VITE_ENABLE_TIER_TOGGLE=true && npx vite --port 3000 --strictPort
# terminal 3
cd frontend && npm run build && npm run e2e                  # 43 checks, screenshots in e2e/shots/
```
PowerShell: `$env:VITE_ENABLE_TIER_TOGGLE='true'; npx vite --port 3000 --strictPort`.
Test-only admin login for the dev server: `E2E_ADMIN_USER` / `E2E_ADMIN_PASS` (defaults are for this local fake database only).

Optional group K (imported question bank, five options): start the backend with `E2E_BANK=1` (PowerShell `$env:E2E_BANK='1'`) and run `E2E_BANK=1 node e2e/frontend.e2e.mjs` (50 checks; without it K is skipped and 43 run). `TEST_DB=pg` on the dev server uses the real PostgreSQL.
Groups: A sign-up form, B register/login/remember, C session expiry + corrupt storage, D full exam by hints (Free) +
result, E certificates/leaderboard/analytics, F empty quiz, G tier switch + Pro hint, H rejected answer,
I admin pages, J bundle (no credentials, no answer keys) + console errors.
Traps: Playwright `hasText` matches textContent (no newline between the option letter and its text); the dev server
state is shared, so restart the backend between runs; the Google button is only exercised in its "not configured" state.
