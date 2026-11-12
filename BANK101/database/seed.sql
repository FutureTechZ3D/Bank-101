-- BANK-101 Database Seed Script

-- 1. Seed Exam Categories
INSERT INTO exam_categories (name, icon, slug) VALUES
('TNPSC', 'star', 'tnpsc'),
('RRB', 'train', 'rrb'),
('SSC', 'workspace_premium', 'ssc'),
('TET', 'school', 'tet'),
('TRB', 'receipt_long', 'trb'),
('UPSC', 'menu_book', 'upsc'),
('BANK EXAMS', 'account_balance', 'bank-exams'),
('GATE', 'engineering', 'gate'),
('JEE', 'calculate', 'jee'),
('NEET', 'medical_services', 'neet');

-- 2. Seed Exam Types for BANK EXAMS
INSERT INTO exam_types (category_id, name) VALUES
((SELECT id FROM exam_categories WHERE slug = 'bank-exams'), 'Preliminary Exam'),
((SELECT id FROM exam_categories WHERE slug = 'bank-exams'), 'Main Exam');

-- 3. Seed Subjects for Preliminary Exam of BANK EXAMS
INSERT INTO subjects (exam_type_id, name, sort_order) VALUES
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Simplification', 1),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Vocabulary', 2),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Reasoning', 3),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Tenses', 4),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Quantitative Aptitude', 5),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'English', 6),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'General Awareness', 7),
((SELECT id FROM exam_types WHERE name = 'Preliminary Exam' AND category_id = (SELECT id FROM exam_categories WHERE slug = 'bank-exams')), 'Computer Knowledge', 8);

-- 4. Seed Topics for Simplification
INSERT INTO topics (subject_id, name, difficulty) VALUES
((SELECT id FROM subjects WHERE name = 'Simplification'), 'BODMAS Rule', 'easy'),
((SELECT id FROM subjects WHERE name = 'Simplification'), 'Percentages & Fractions', 'medium'),
((SELECT id FROM subjects WHERE name = 'Simplification'), 'Square Roots & Cube Roots', 'medium');

-- 5. Seed Quiz Tests for Simplification
-- Only tests that really have questions are seeded (2-8 were empty placeholders that still claimed 10 questions).
-- More tests come from the question-bank import.
INSERT INTO quiz_tests (topic_id, name, total_qs, duration_mins, year) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Quiz Test 1', 10, 10, 2026);

-- 6. Seed Questions into Question Bank
-- Question 1
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'What is the value of 240 ÷ 8 × 512 ÷ 4 - 25?', 'easy', 2025, 'English');
-- Question 2
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Evaluate: 45% of 600 + 150% of 240 - 25% of 400', 'medium', 2025, 'English');
-- Question 3
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Find the value of: (18 × 15) ÷ 3 + (24 × 8) ÷ 4', 'easy', 2026, 'English');
-- Question 4
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Solve: 5/12 of 360 + 3/8 of 640 - 4/5 of 250', 'medium', 2024, 'English');
-- Question 5
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'What is the square root of (144 + 256 + 624) divided by 2?', 'medium', 2026, 'English');
-- Question 6
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Solve: (12 × 12 - 40) ÷ 8 + 15 × 4', 'easy', 2025, 'English');
-- Question 7
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'What is the value of 3/5 of 4/7 of 7/9 of 450?', 'easy', 2026, 'English');
-- Question 8
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Evaluate: 625 ÷ 25 × 5 + 120 - 75 ÷ 15', 'easy', 2025, 'English');
-- Question 9
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Solve: (240 - 40) ÷ 4 + 16 × 5 - 12 × 3', 'easy', 2024, 'English');
-- Question 10
INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES
((SELECT id FROM topics WHERE name = 'BODMAS Rule'), 'Find the value of x in the equation: x + 15% of 400 = 25% of 800 - 40', 'medium', 2026, 'English');

-- 7. Seed Options for Questions
-- Q1 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(1, 'A', '3815', true),
(1, 'B', '3840', false),
(1, 'C', '3825', false),
(1, 'D', '3800', false);

-- Q2 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(2, 'A', '530', true),
(2, 'B', '550', false),
(2, 'C', '510', false),
(2, 'D', '490', false);

-- Q3 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(3, 'A', '128', false),
(3, 'B', '138', true),
(3, 'C', '148', false),
(3, 'D', '118', false);

-- Q4 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(4, 'A', '190', true),
(4, 'B', '210', false),
(4, 'C', '180', false),
(4, 'D', '200', false);

-- Q5 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(5, 'A', '16', true),
(5, 'B', '18', false),
(5, 'C', '20', false),
(5, 'D', '14', false);

-- Q6 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(6, 'A', '73', true),
(6, 'B', '70', false),
(6, 'C', '68', false),
(6, 'D', '75', false);

-- Q7 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(7, 'A', '120', true),
(7, 'B', '100', false),
(7, 'C', '140', false),
(7, 'D', '80', false);

-- Q8 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(8, 'A', '240', true),
(8, 'B', '245', false),
(8, 'C', '235', false),
(8, 'D', '250', false);

-- Q9 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(9, 'A', '94', true),
(9, 'B', '98', false),
(9, 'C', '90', false),
(9, 'D', '102', false);

-- Q10 Options
INSERT INTO options (question_id, label, text, is_correct) VALUES
(10, 'A', '100', true),
(10, 'B', '110', false),
(10, 'C', '90', false),
(10, 'D', '120', false);

-- 8. Seed Explanations
INSERT INTO explanations (question_id, short_answer, detailed_text) VALUES
(1, 'Correct Answer: A', '1) 240 ÷ 8 = 30.
2) 512 ÷ 4 = 128.
3) Multiply: 30 × 128 = 3840.
4) Subtract 25: 3840 - 25 = 3815.'),
(2, 'Correct Answer: A', '1) 45% of 600 = 270.
2) 150% of 240 = 360.
3) 25% of 400 = 100.
4) Calculate: 270 + 360 - 100 = 630 - 100 = 530.'),
(3, 'Correct Answer: B', '1) (18 × 15) ÷ 3 = 270 ÷ 3 = 90.
2) (24 × 8) ÷ 4 = 192 ÷ 4 = 48.
3) Add: 90 + 48 = 138.'),
(4, 'Correct Answer: A', '1) 5/12 of 360 = 150.
2) 3/8 of 640 = 240.
3) 4/5 of 250 = 200.
4) Calculate: 150 + 240 - 200 = 390 - 200 = 190.'),
(5, 'Correct Answer: A', '1) Sum inside the square root: 144 + 256 + 624 = 1024.
2) Square root of 1024 = 32.
3) Divide by 2: 32 ÷ 2 = 16.'),
(6, 'Correct Answer: A', '1) 12 × 12 - 40 = 144 - 40 = 104.
2) Divide by 8: 104 ÷ 8 = 13.
3) 15 × 4 = 60.
4) Add: 13 + 60 = 73.'),
(7, 'Correct Answer: A', '1) 3/5 * 4/7 * 7/9 * 450.
2) Simplify: (3/5) * (4/9) * 450 = (12/45) * 450 = 12 * 10 = 120.'),
(8, 'Correct Answer: A', '1) 625 ÷ 25 = 25.
2) 25 × 5 = 125.
3) 75 ÷ 15 = 5.
4) Calculate: 125 + 120 - 5 = 245 - 5 = 240.'),
(9, 'Correct Answer: A', '1) (240 - 40) ÷ 4 = 200 ÷ 4 = 50.
2) 16 × 5 = 80.
3) 12 × 3 = 36.
4) Calculate: 50 + 80 - 36 = 130 - 36 = 94.'),
(10, 'Correct Answer: A', '1) 15% of 400 = 60.
2) 25% of 800 = 200.
3) Equation becomes: x + 60 = 200 - 40.
4) x + 60 = 160.
5) x = 100.');

-- 9. Map Questions to Quiz Test 1
INSERT INTO quiz_question_map (quiz_id, question_id, sort_order) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4),
(1, 5, 5),
(1, 6, 6),
(1, 7, 7),
(1, 8, 8),
(1, 9, 9),
(1, 10, 10);
