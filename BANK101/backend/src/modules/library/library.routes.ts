import { Router } from 'express';
import {
  listBooks,
  getBookDetail,
  listPYQPapers,
  getPYQDetail,
} from './library.controller';

export const libraryRouter = Router();

// Digital Academic Books
libraryRouter.get('/books', listBooks);
libraryRouter.get('/books/:id', getBookDetail);

// Previous-Year Papers (PYQ)
libraryRouter.get('/pyq', listPYQPapers);
libraryRouter.get('/pyq/:id', getPYQDetail);

