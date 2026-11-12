import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  validateQuestionBatch,
  parseCSVQuestions,
  commitQuestionBatch,
} from './dataset.service';

function ok(res: Response, data: any) {
  return res.json({ success: true, ...data });
}

function fail(res: Response, message: string, status = 400, extra: any = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

export async function previewDataset(req: AuthenticatedRequest, res: Response) {
  try {
    let rawQuestions: any[] = [];
    const { format, content, questions } = req.body || {};

    if (Array.isArray(questions)) {
      rawQuestions = questions;
    } else if (format === 'csv' && typeof content === 'string') {
      rawQuestions = parseCSVQuestions(content);
    } else if (typeof content === 'string') {
      try {
        rawQuestions = JSON.parse(content);
      } catch {
        return fail(res, 'Content is not valid JSON text');
      }
    } else {
      return fail(res, 'Invalid payload: provide questions array or content string with format');
    }

    const validation = validateQuestionBatch(rawQuestions);
    return ok(res, { validation });
  } catch (err: any) {
    console.error('previewDataset error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process dataset preview' });
  }
}

export async function importDataset(req: AuthenticatedRequest, res: Response) {
  try {
    let rawQuestions: any[] = [];
    const { format, content, questions, dataset_name, create_quiz, quiz_title } = req.body || {};

    if (Array.isArray(questions)) {
      rawQuestions = questions;
    } else if (format === 'csv' && typeof content === 'string') {
      rawQuestions = parseCSVQuestions(content);
    } else if (typeof content === 'string') {
      try {
        rawQuestions = JSON.parse(content);
      } catch {
        return fail(res, 'Content is not valid JSON text');
      }
    } else {
      return fail(res, 'Invalid payload: provide questions array or content string with format');
    }

    const validation = validateQuestionBatch(rawQuestions);
    if (!validation.valid || validation.invalidRows > 0) {
      return fail(res, 'Dataset contains validation errors. Please preview first.', 400, {
        errors: validation.errors,
      });
    }

    const commitResult = await commitQuestionBatch(rawQuestions, {
      datasetName: dataset_name || `Dataset-${Date.now()}`,
      userId: req.user?.id,
      createQuizTest: create_quiz === true,
      quizTitle: quiz_title,
    });

    return ok(res, {
      message: 'Dataset imported successfully',
      ...commitResult,
    });
  } catch (err: any) {
    console.error('importDataset error:', err);
    return res.status(500).json({ success: false, message: 'Failed to commit dataset' });
  }
}

