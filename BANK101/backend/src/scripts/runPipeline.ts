import '../config/env';
import { runFullPipeline } from '../pipeline/importer';
import { getPipelineStats } from '../pipeline/pipeline.service';

async function main() {
  console.log('=====================================================');
  console.log('BANK-101 Open-Source Academic Ingestion Pipeline');
  console.log('=====================================================');
  console.log('Starting ingestion of NCERT, SCERT, PYQs, and Curated Question Banks...');

  const summary = await runFullPipeline();

  console.log('\n--- INGESTION SUMMARY ---');
  console.log(`Timestamp: ${summary.timestamp}`);
  console.log(`Questions Imported: ${summary.total_questions_imported}`);
  console.log(`Questions Skipped (Duplicates): ${summary.total_questions_skipped}`);
  console.log(`Digital Books Imported: ${summary.total_books_imported}`);
  console.log(`Book Chapters Indexed: ${summary.total_chapters_imported}`);
  console.log(`PYQ Papers Imported: ${summary.total_pyq_papers_imported}`);
  console.log(`PYQ Questions Indexed: ${summary.total_pyq_questions_imported}`);
  console.log(`CBT Mock Tests Created: ${summary.total_mock_tests_created}`);
  console.log(`Time Taken: ${(summary.duration_ms / 1000).toFixed(2)}s`);

  const stats = await getPipelineStats();
  console.log('\n--- CURRENT REPOSITORY STATS ---');
  console.log(`Total Questions in Bank: ${stats.total_questions}`);
  console.log(`Total Quizzes & Mock Tests: ${stats.total_quizzes}`);
  console.log(`Total Books in Library: ${stats.total_books}`);
  console.log(`Total Chapters: ${stats.total_chapters}`);
  console.log(`Total PYQ Papers: ${stats.total_pyq_papers}`);
  console.log(`Total PYQ Questions: ${stats.total_pyq_questions}`);
  console.log('=====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
