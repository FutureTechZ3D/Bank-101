/**
 * Loads the independently verified question bank into the database configured by DATABASE_URL.
 *
 *   npm run import:bank                       (uses ../database/import/verified.json)
 *   npm run import:bank -- path/to/file.json  (any file with { topic, quizzesData } in the admin-upload format)
 *
 * Safe to run twice: quizzes whose name already exists under the topic are skipped, and the whole import is one transaction.
 * Produce verified.json first:  cd database/import && python extract_pdfs.py && python verify.py
 */
import fs from 'fs';
import path from 'path';
import '../config/env';
import { checkDb } from '../config/db';
import { importQuizzes, validatePayload } from '../modules/admin/importQuizzes';

async function main() {
  const file = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..', 'database', 'import', 'verified.json'));
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problem = validatePayload(bank.topic, bank.quizzesData);
  if (problem) throw new Error(`Invalid import file: ${problem}`);
  await checkDb();
  const r = await importQuizzes(bank.topic, bank.quizzesData, { skipExisting: true });
  console.log(`Imported ${r.quizzes} quizzes / ${r.questions} questions into topic '${bank.topic}'. Skipped (already there): ${r.skipped.length}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Import failed:', e.message);
  process.exit(1);
});
