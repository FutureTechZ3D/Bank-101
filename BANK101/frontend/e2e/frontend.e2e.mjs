/**
 * End-to-end test of the BANK101 frontend in a REAL Chromium (Playwright) against the REAL backend app
 * (pg-mem database loaded with the real schema/seed). Everything a user does goes through the UI.
 *
 * Start first (two terminals):
 *   cd backend  && npm run dev:test-server        (port 5000)
 *   cd frontend && npx vite --port 3000 --strictPort
 * Run:  cd frontend && node e2e/frontend.e2e.mjs
 *
 * Network doubles are used in exactly ONE place (check group H) to force a server answer that is hard to
 * trigger by hand (an answer rejected because time is over). It is labelled there.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'e2e_admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'e2e-admin-passphrase-1';
const PASSWORD = 'correct-horse-battery';
const SHOTS = path.resolve('e2e/shots');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log('  PASS', name);
  } else {
    failures.push(name + (detail ? ' :: ' + detail : ''));
    console.log('  FAIL', name, detail);
  }
}

const browser = await chromium.launch();
const consoleErrors = [];
async function newPage(viewport = { width: 1360, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => {
    // Chrome logs every 4xx response as a console error; those are expected in the negative tests.
    if (m.type() === 'error' && !/Failed to load resource|status of 4\d\d|net::ERR/.test(m.text())) consoleErrors.push(m.text());
  });
  return { ctx, page };
}

const uname = (p) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const wait = (page, ms = 500) => page.waitForTimeout(ms);
const bodyText = async (page) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ');

async function signUp(page, username, password = PASSWORD) {
  await page.goto(BASE);
  await page.locator('input[type=text]').first().fill(username);
  await page.locator('input[type=password]').first().fill(password);
  await page.getByRole('button', { name: /Sign Up/ }).click();
}
async function logIn(page, username, password = PASSWORD, remember = true) {
  await page.goto(BASE);
  await page.locator('input[type=text]').nth(1).fill(username);
  await page.locator('input[type=password]').nth(1).fill(password);
  const box = page.locator('#remember');
  if ((await box.isChecked()) !== remember) await box.click();
  await page.getByRole('button', { name: /^Login/ }).click();
}
async function openQuiz(page, quizName = 'Quiz Test 1') {
  for (const [kind, name] of [['h', 'Bank Exams'], ['t', 'IBPS PO'], ['t', 'Quantitative Aptitude'], ['t', 'Simplification'], ['t', quizName]]) {
    await (kind === 'h' ? page.getByRole('heading', { name }) : page.getByText(name, { exact: true }).first()).click();
    await wait(page, 450);
  }
}
// Option buttons render as "<letter><text>" (textContent has no space between them); sidebar buttons start with a lowercase icon name.
const optionBtn = (page, letter) => page.locator('button').filter({ hasText: new RegExp(`^${letter}(?![A-Za-z_])`) }).first();
const store = (page, area, key) => page.evaluate(([a, k]) => window[a].getItem(k), [area, key]);

try {
  // ------------------------------------------------------------------ A. sign-up form
  console.log('A. sign-up form');
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    check('A1 login page renders both panels, no JS errors', (await bodyText(page)).includes('Create your account') && (await bodyText(page)).includes('Welcome Back'));
    await page.locator('input[type=text]').first().fill('ab');
    await page.locator('input[type=password]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /Sign Up/ }).click();
    await wait(page, 300);
    const alert = await page.locator('[role=alert]').first().innerText().catch(() => '');
    check('A2 a too-short username shows a message in the SIGN-UP panel', /Username must be 3-50/.test(alert), alert);
    check('A3 the password field enforces 8+ characters (HTML minLength)', (await page.locator('input[type=password]').first().getAttribute('minlength')) === '8');
    check('A4 the Google button is honest when Google is not configured (no fake login button)', (await bodyText(page)).includes('Google sign-in is not configured') && (await page.getByText('Google Authentication').count()) === 0);
    await page.screenshot({ path: path.join(SHOTS, 'A_signup_error.png') });
    await ctx.close();
  }

  // ------------------------------------------------------------------ B. register, duplicate, login errors, remember
  console.log('B. register / login');
  const userA = uname('e2e_a');
  {
    const { ctx, page } = await newPage();
    await signUp(page, userA);
    await page.getByText(`Welcome back, ${userA}!`).waitFor({ timeout: 8000 }).catch(() => {});
    check('B1 registering lands on the dashboard for the new user', (await bodyText(page)).includes(`Welcome back, ${userA}!`));
    check('B2 session is kept in localStorage (remember default)', !!(await store(page, 'localStorage', 'bank101_token')) && !(await store(page, 'sessionStorage', 'bank101_token')));
    const tokenA = await store(page, 'localStorage', 'bank101_token');

    await page.getByRole('button', { name: /Logout/ }).click();
    await wait(page, 400);
    check('B3 logout returns to the login page and clears the stored token', (await bodyText(page)).includes('Welcome Back') && !(await store(page, 'localStorage', 'bank101_token')));

    await page.locator('input[type=text]').first().fill(userA);
    await page.locator('input[type=password]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /Sign Up/ }).click();
    await wait(page, 700);
    const dup = await page.locator('[role=alert]').first().innerText().catch(() => '');
    check('B4 REGRESSION: a duplicate username shows the SERVER message (the old code showed a stale/empty one)', /already taken/i.test(dup), dup);

    await page.locator('input[type=text]').nth(1).fill(userA);
    await page.locator('input[type=password]').nth(1).fill('wrong-password-123');
    await page.getByRole('button', { name: /^Login/ }).click();
    await wait(page, 700);
    const bad = await bodyText(page);
    check('B5 a wrong password shows "Invalid username or password"', /Invalid username or password/.test(bad));
    check('B6 failed login stores nothing', !(await store(page, 'localStorage', 'bank101_token')) && !(await store(page, 'sessionStorage', 'bank101_token')));
    await ctx.close();
    void tokenA;
  }
  {
    const { ctx, page } = await newPage();
    await logIn(page, userA, PASSWORD, false);
    await page.getByText(`Welcome back, ${userA}!`).waitFor({ timeout: 8000 }).catch(() => {});
    check('B7 login with "Remember this device" OFF uses sessionStorage only', !!(await store(page, 'sessionStorage', 'bank101_token')) && !(await store(page, 'localStorage', 'bank101_token')));
    await ctx.close();
  }

  // ------------------------------------------------------------------ C. session expiry
  console.log('C. session expiry');
  {
    const { ctx, page } = await newPage();
    await logIn(page, userA);
    await page.getByText(`Welcome back, ${userA}!`).waitFor({ timeout: 8000 }).catch(() => {});
    await page.evaluate(() => localStorage.setItem('bank101_token', 'not.a.valid.token'));
    await page.reload();
    await wait(page, 500);
    check('C1 a corrupted stored session still opens the app shell (no crash)', (await bodyText(page)).includes('BANK-101'));
    await page.getByRole('button', { name: /Leaderboard/ }).first().click();
    await wait(page, 900);
    const t = await bodyText(page);
    check('C2 REGRESSION: the server rejecting the token sends the user to login with "session has expired"', t.includes('Welcome Back') && /session has expired/i.test(t), t.slice(0, 200));
    check('C3 the dead token is removed from storage', !(await store(page, 'localStorage', 'bank101_token')));
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await page.evaluate(() => localStorage.setItem('bank101_user', '{not json'));
    await page.evaluate(() => localStorage.setItem('bank101_token', 'x'));
    await page.reload();
    await wait(page, 400);
    check('C4 REGRESSION: a corrupted saved user (invalid JSON) no longer crashes the app', (await bodyText(page)).includes('Welcome Back'));
    await ctx.close();
  }

  // ------------------------------------------------------------------ D. full exam by hints (Free tier)
  console.log('D. exam, hints, result (Free)');
  const userB = uname('e2e_b');
  {
    const { ctx, page } = await newPage();
    await signUp(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    await openQuiz(page, 'Quiz Test 1');
    await page.getByRole('button', { name: /Start Exam/i }).click();
    await wait(page, 1000);
    const t0 = await bodyText(page);
    check('D1 the timer starts at the QUIZ duration (10:00), not a fixed 50:00', /\b09:5\d\b|\b10:00\b/.test(t0), t0.slice(200, 400));
    check('D2 free tier shows 10 hints left', /Use Hint \(10 Left\)/.test(t0));

    let wrongOnPurpose = 0;
    for (let i = 1; i <= 10; i++) {
      await page.getByRole('button', { name: /^Use Hint/ }).click();
      await wait(page, 350);
      const txt = await bodyText(page);
      const m = txt.match(/Correct Option letter:\s*\|?\s*([A-D])/);
      const letter = m ? m[1] : null;
      if (i === 1) check('D3 a hint reveals the correct letter', !!letter, txt.slice(0, 300));
      if (i === 1) check('D4 Free hint shows NO step-by-step solution, only the upgrade note', !/step-by-step solution:/i.test(txt) && /upgrade to pro/i.test(txt));
      if (!letter) break;
      let choose = letter;
      if (i >= 9) {
        // last two: deliberately answer wrong to get a non-perfect score
        choose = ['A', 'B', 'C', 'D'].find((x) => x !== letter);
        wrongOnPurpose++;
      }
      await optionBtn(page, choose).click();
      await wait(page, 250);
      if (i < 10) await page.getByRole('button', { name: /^Next$/ }).click();
      await wait(page, 150);
    }
    const afterHints = await bodyText(page);
    check('D5 after 10 hints the button says 0 Left / Hint Used', /Hint Used|0 Left/.test(afterHints));
    await page.screenshot({ path: path.join(SHOTS, 'D_exam_last_question.png') });

    // submit
    await page.getByRole('button', { name: /Submit/i }).first().click();
    await wait(page, 400);
    const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|Submit Exam|Finish/i }).last();
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
    await page.getByText(/You scored/).first().waitFor({ timeout: 8000 }).catch(() => {});
    const res = await bodyText(page);
    check('D6 the result page shows 8 correct out of 10 (80%) computed by the server', /scored\s*\|?\s*8\s*\|?\s*out of\s*\|?\s*10/.test(res.replace(/\s+/g, ' ')) || (/80%/.test(res) && /8 \/ 10/.test(res)), res.slice(0, 500));
    check('D7 the percentage is a number in the UI (not NaN / a string artefact)', !/NaN/.test(res));
    await page.screenshot({ path: path.join(SHOTS, 'D_result.png') });
    check('D8 wrong-on-purpose count was 2', wrongOnPurpose === 2);

    // sidebar points updated: 8 correct = 80 pts
    check('D9 the sidebar shows the new points (80 pts) after submit', /80 pts/.test(res));

    // E. certificate + leaderboard + analytics from the real database
    console.log('E. certificates, leaderboard, analytics');
    await page.getByRole('button', { name: /Certificates/ }).first().click();
    await wait(page, 900);
    const cert = await bodyText(page);
    check('E1 an 80% attempt earned a certificate (Quiz Test 1, 80%)', /Quiz Test 1/.test(cert) && /80%/.test(cert), cert.slice(250, 600));
    await page.getByRole('button', { name: /Leaderboard/ }).first().click();
    await wait(page, 900);
    const lb = await bodyText(page);
    check('E2 the leaderboard lists this REAL user with 80 points and no fake seed users', lb.includes(userB) && /80/.test(lb) && !/karthik|priya/i.test(lb), lb.slice(250, 600));
    await page.screenshot({ path: path.join(SHOTS, 'E_leaderboard.png') });
    await page.getByRole('button', { name: /Performance/ }).first().click();
    await wait(page, 900);
    const an = await bodyText(page);
    check('E3 analytics shows 1 attempt', /\b1\b/.test(an) && !/NaN/.test(an), an.slice(250, 600));
    await ctx.close();
  }

  // ------------------------------------------------------------------ F. quiz with no questions
  console.log('F. empty quiz');
  {
    const { ctx, page } = await newPage();
    await logIn(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    // TEST DOUBLE: the seed no longer has an empty quiz (they were removed because they claimed questions they did not have),
    // so the server answer "this quiz has no questions" is simulated for the questions request only.
    await page.route('**/api/v1/questions?quiz_id=*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, questions: [] }) }));
    await openQuiz(page, 'Quiz Test 1');
    await page.getByRole('button', { name: /Start Exam/i }).click();
    await wait(page, 900);
    const t = await bodyText(page);
    check('F1 REGRESSION: a quiz with no questions shows "no questions yet" and does NOT open an empty exam room', /no questions yet/i.test(t) && !/Loading exam room/.test(t), t.slice(250, 500));
    await page.screenshot({ path: path.join(SHOTS, 'F_empty_quiz.png') });
    await ctx.close();
  }

  // ------------------------------------------------------------------ G. Pro tier via the test switch
  console.log('G. tier switch + Pro hint');
  {
    const { ctx, page } = await newPage();
    await logIn(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    const sw = page.getByRole('button', { name: /Test: switch to Pro/ });
    check('G1 the test switch is visible (build flag on)', await sw.isVisible().catch(() => false));
    await sw.click();
    await wait(page, 700);
    check('G2 after switching, the badge says PRO (server accepted it)', /PRO/.test(await bodyText(page)));
    await openQuiz(page, 'Quiz Test 1');
    await page.getByRole('button', { name: /Start Exam/i }).click();
    await wait(page, 1000);
    check('G3 Pro shows unlimited hints', /Pro Unlimited/.test(await bodyText(page)));
    await page.getByRole('button', { name: /^Use Hint/ }).click();
    await wait(page, 500);
    check('G4 a Pro hint includes the step-by-step solution', /step-by-step solution:/i.test(await bodyText(page)));
    await page.screenshot({ path: path.join(SHOTS, 'G_pro_hint.png') });
    await ctx.close();
  }

  // ------------------------------------------------------------------ H. answer rejected by the server (time over)
  console.log('H. rejected answer (network double for ONE response)');
  {
    const { ctx, page } = await newPage();
    await logIn(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    await openQuiz(page, 'Quiz Test 1');
    await page.getByRole('button', { name: /Start Exam/i }).click();
    await wait(page, 900);
    // TEST DOUBLE: pretend the server says time is over for the next answer (hard to reach by hand).
    await page.route('**/api/v1/attempts/answer', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Time is over for this attempt' }) })
    );
    await optionBtn(page, 'A').click();
    await wait(page, 1500);
    const t = await bodyText(page);
    check('H1 REGRESSION: a rejected answer is NOT silently kept; the reason is shown or the exam ended', /Time is over/i.test(t) || /You scored/.test(t), t.slice(250, 500));
    check('H2 after "time is over" the app finishes the attempt and shows the result page', /You scored/.test(t), t.slice(250, 500));
    await page.screenshot({ path: path.join(SHOTS, 'H_time_over.png') });
    await ctx.close();
  }

  // ------------------------------------------------------------------ I. admin
  console.log('I. admin pages');
  {
    const { ctx, page } = await newPage();
    await logIn(page, ADMIN_USER, ADMIN_PASS);
    await wait(page, 1500);
    const t = await bodyText(page);
    // Compare the page with the API's own numbers (they change as tests add users/quizzes, so no fixed value).
    const api = await page.evaluate(async () => {
      const tk = localStorage.getItem('bank101_token');
      return (await fetch('/api/v1/admin/stats', { headers: { Authorization: 'Bearer ' + tk } })).json();
    });
    const numbersShown = [api.totalUsers, api.totalQuizzes, api.totalQuestions, api.totalAttempts].every((n) => typeof n === 'number' && new RegExp(`\\b${n}\\b`).test(t));
    check('I1 the admin sees the telemetry page showing the same numbers the API reports', /Platform Telemetry/i.test(t) && numbersShown, JSON.stringify(api).slice(0, 160) + ' || ' + t.slice(0, 200));
    check('I2 recent users are listed WITHOUT any password hash text', !/\$2[aby]\$/.test(t));
    await page.screenshot({ path: path.join(SHOTS, 'I_admin.png') });
    const upload = page.getByRole('button', { name: /Ingest|Upload|Data/i }).first();
    if (await upload.isVisible().catch(() => false)) await upload.click();
    await wait(page, 500);
    const ta = page.locator('textarea').first();
    if (await ta.isVisible().catch(() => false)) {
      await ta.fill(JSON.stringify([{ quiz_name: 'Bad Quiz', questions: [{ question: 'x?', options: { A: '1', B: '2', C: '3', D: '4' }, correct_option: 'Z' }] }]));
      await page.getByRole('button', { name: /Deploy|Ingest|Upload|Submit|Send/i }).last().click();
      await wait(page, 900);
      const bad = await bodyText(page);
      check('I3 an invalid quiz payload is refused and the server reason is shown (correct_option)', /correct_option/i.test(bad), bad.slice(300, 700));
      await ta.fill(JSON.stringify([{ quiz_name: 'E2E Quiz', questions: [{ question: 'Pick B', options: { A: '1', B: '2', C: '3', D: '4' }, correct_option: 'B', explanation: 'B is right.' }] }]));
      await page.getByRole('button', { name: /Deploy|Ingest|Upload|Submit|Send/i }).last().click();
      await wait(page, 1200);
      const ok = await bodyText(page);
      check('I4 a valid payload is accepted and reported', /Successfully uploaded 1 quizzes/i.test(ok), ok.slice(300, 700));
      await page.screenshot({ path: path.join(SHOTS, 'I_upload.png') });
    } else {
      check('I3 admin upload textarea reachable', false, 'textarea not found');
    }
    await ctx.close();
  }
  {
    // a normal user must not be able to use the admin pages at all
    const { ctx, page } = await newPage();
    await logIn(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(async () => {
      const t = localStorage.getItem('bank101_token');
      const res = await fetch('/api/v1/admin/stats', { headers: { Authorization: 'Bearer ' + t } });
      return res.status;
    });
    check('I5 a normal user calling the admin API gets 403', r === 403, String(r));
    await ctx.close();
  }

  // ------------------------------------------------------------------ K. imported question bank (needs E2E_BANK=1 on the dev server)
  console.log('K. imported question bank (five options)');
  if (process.env.E2E_BANK !== '1') {
    console.log('  SKIP K (start the backend with E2E_BANK=1 and run with E2E_BANK=1)');
  } else {
    const { ctx, page } = await newPage();
    await logIn(page, userB);
    await page.getByText(`Welcome back, ${userB}!`).waitFor({ timeout: 8000 }).catch(() => {});
    for (const [kind, name] of [['h', 'Bank Exams'], ['t', 'IBPS PO'], ['t', 'Quantitative Aptitude'], ['t', 'Simplification']]) {
      await (kind === 'h' ? page.getByRole('heading', { name }) : page.getByText(name, { exact: true }).first()).click();
      await wait(page, 450);
    }
    await wait(page, 600);
    const listText = await bodyText(page);
    const shown = (listText.match(/Simplification Quiz \d+/g) || []).length;
    check('K1 the quiz list shows the imported quizzes (41 imported + the seeded Quiz Test 1)', shown >= 41 && /Quiz Test 1/.test(listText), `shown ${shown}`);
    await page.screenshot({ path: path.join(SHOTS, 'K_quiz_list.png') });

    await page.getByText('Simplification Quiz 13', { exact: true }).first().click();
    await wait(page, 600);
    await page.getByRole('button', { name: /Start Exam/i }).click();
    await wait(page, 1000);
    const n = Number(((await bodyText(page)).match(/QUESTION 1 OF (\d+)/) || [])[1] || 0);
    check('K2 an imported quiz opens with its verified questions (5 in Quiz 13)', n === 5, `n=${n}`);
    const optButtons = await page.locator('button').filter({ hasText: /^[A-E](?![A-Za-z_])/ }).count();
    check('K3 the exam room shows FIVE option buttons A-E (E was invisible before)', optButtons === 5, `buttons ${optButtons}`);

    let sawE = false;
    for (let i = 1; i <= n; i++) {
      await page.getByRole('button', { name: /^Use Hint/ }).click();
      await wait(page, 350);
      const m = (await bodyText(page)).match(/Correct Option letter:\s*\|?\s*([A-E])/);
      const letter = m ? m[1] : null;
      if (letter === 'E') sawE = true;
      if (!letter) break;
      await optionBtn(page, letter).click();
      await wait(page, 250);
      if (i < n) await page.getByRole('button', { name: /^Next$/ }).click();
      await wait(page, 150);
    }
    check('K4 one question of the quiz has E as its right answer and E can be chosen', sawE);
    await page.getByRole('button', { name: /Submit/i }).first().click();
    await wait(page, 400);
    const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|Submit Exam|Finish/i }).last();
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
    await page.getByText(/You scored/).first().waitFor({ timeout: 8000 }).catch(() => {});
    const res = await bodyText(page);
    check('K5 answering every question with the revealed key gives 5 out of 5 (100%)', /You scored\s*\|?\s*5\s*\|?\s*out of\s*\|?\s*5/.test(res.replace(/\s+/g, ' ')) || (/100%/.test(res) && /5 \/ 5/.test(res)), res.slice(250, 600));
    check('K6 the review shows option E with its text', /\bE\b/.test(res) && /None of these|14\.36/.test(res), res.slice(300, 700));
    check('K7 the generated explanation is shown (no flattened PDF text)', /Evaluating the expression gives|in place of \?/.test(res));
    await page.screenshot({ path: path.join(SHOTS, 'K_result_five_options.png') });
    await ctx.close();
  }

  // ------------------------------------------------------------------ J. bundle + console
  console.log('J. bundle and console');
  {
    const dist = path.resolve('dist/assets');
    let bundle = '';
    if (fs.existsSync(dist)) for (const f of fs.readdirSync(dist)) if (f.endsWith('.js')) bundle += fs.readFileSync(path.join(dist, f), 'utf8');
    check('J1 the built bundle exists (run npm run build first)', bundle.length > 1000);
    check('J2 the built bundle contains none of the old hard-coded credentials', !/Sanjay2004|Rithesh2003|Sanjay@svm|ask2004|Jarvis2003/.test(bundle));
    check('J3 the built bundle ships no quiz answer keys (no correct_option data)', (bundle.match(/correct_option/g) || []).length <= 2);
    check('J4 no uncaught page errors or console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
  }
} catch (e) {
  failures.push('SUITE CRASH: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e));
  console.log('CRASH', e);
} finally {
  await browser.close();
}

console.log(`\nRESULT: ${pass} passed, ${failures.length} failed`);
failures.forEach((f) => console.log(' - ' + f));
process.exit(failures.length ? 1 : 0);
