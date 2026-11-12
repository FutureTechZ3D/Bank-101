import { Router } from 'express';
import {
  listAuthorities,
  getAuthorityDetail,
  listExams,
  getExamDetail,
  getExamSyllabus,
  compareExams,
} from './catalog.controller';

export const catalogRouter = Router();

// Authorities
catalogRouter.get('/authorities', listAuthorities);
catalogRouter.get('/authorities/:codeOrId', getAuthorityDetail);

// Exams
catalogRouter.get('/exams', listExams);
catalogRouter.get('/exams/:slugOrId', getExamDetail);
catalogRouter.get('/exams/:slugOrId/syllabus', getExamSyllabus);

// Cross-Exam Comparison Engine
catalogRouter.get('/compare', compareExams);

