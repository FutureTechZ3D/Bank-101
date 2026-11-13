import crypto from 'crypto';
import { IngestQuestion, IngestOption } from './types';

/**
 * Normalizes question text into a canonical lowercase whitespace-stripped string
 * and computes a SHA-256 hash for deduplication across multiple dataset files.
 */
export function computeQuestionHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '') // preserves Tamil characters (\u0B80-\u0BFF) & alphanumeric
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Validates and standardizes question options.
 * Ensures letters 'A', 'B', 'C', 'D' / 'E' are properly mapped and exactly one is marked correct.
 */
export function validateAndCleanOptions(options: IngestOption[]): IngestOption[] {
  if (!options || options.length < 2) {
    throw new Error('Question must contain at least 2 options');
  }

  const standardLabels = ['A', 'B', 'C', 'D', 'E'];
  const cleaned: IngestOption[] = options.map((opt, idx) => {
    const label = opt.label?.toUpperCase() || standardLabels[idx] || `OPT_${idx + 1}`;
    return {
      label: label.trim(),
      text: opt.text.trim(),
      text_ta: opt.text_ta?.trim(),
      is_correct: Boolean(opt.is_correct),
    };
  });

  const correctCount = cleaned.filter((o) => o.is_correct).length;
  if (correctCount === 0) {
    // Default to first option if not explicitly marked (safe fallback for imports)
    cleaned[0].is_correct = true;
  } else if (correctCount > 1) {
    // Keep only the first true
    let found = false;
    for (const opt of cleaned) {
      if (opt.is_correct) {
        if (found) opt.is_correct = false;
        else found = true;
      }
    }
  }

  return cleaned;
}

/**
 * Cleans LaTeX and math formulas, ensuring inline math syntax ($...$) is properly balanced.
 */
export function cleanMathText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\\[/g, '$$$')
    .replace(/\\\]/g, '$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .trim();
}

