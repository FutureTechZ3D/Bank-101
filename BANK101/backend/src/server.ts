import './config/env';
import { jwtSecret } from './config/env';
import { checkDb } from './config/db';
import { createApp } from './app';
import { runFullPipeline } from './pipeline/importer';

async function main() {
  jwtSecret(); // fail fast if the secret is missing
  await checkDb(); // fail fast if PostgreSQL is not reachable (no silent mock fallback any more)

  // Automatically ensure all open-source academic datasets (books, PYQs, curated questions, mock tests)
  // are imported on startup without requiring manual admin intervention.
  try {
    const summary = await runFullPipeline();
    if (
      summary.total_questions_imported > 0 ||
      summary.total_books_imported > 0 ||
      summary.total_pyq_papers_imported > 0 ||
      summary.total_mock_tests_created > 0
    ) {
      console.log(
        `Auto-imported open datasets: ${summary.total_questions_imported} questions, ` +
          `${summary.total_books_imported} books, ${summary.total_pyq_papers_imported} PYQ papers, ` +
          `${summary.total_mock_tests_created} mock tests`
      );
    }
  } catch (err: any) {
    console.warn('Auto-import skipped on startup:', err?.message || err);
  }

  const PORT = Number(process.env.PORT) || 5000;
  createApp().listen(PORT, () => {
    console.log(`BANK-101 Backend API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Cannot start BANK-101 backend:', err.message);
  process.exit(1);
});
