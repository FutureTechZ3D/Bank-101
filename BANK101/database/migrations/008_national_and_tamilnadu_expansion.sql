-- 008_national_and_tamilnadu_expansion.sql -- Comprehensive National & Tamil Nadu State Catalog Expansion
-- Covers: UPSC CSE, TNPSC Group 1 & 4, TNUSRB SI & Constable, TRB TNTET & PG Assistant, MRB, TANGEDCO, NEET UG, GATE CS, CAT, RRB NTPC

-- ── 1. Additional State & National Authorities ───────────────────────────────
INSERT INTO exam_authorities (state_id, code, name, website_url, description)
SELECT s.id, a.code, a.name, a.url, a.descr
FROM (VALUES
  ('TN', 'MRB', 'Medical Services Recruitment Board (Tamil Nadu)', 'https://mrb.tn.gov.in', 'Direct recruitment for doctors, nurses, and paramedical cadres in Tamil Nadu health services'),
  ('TN', 'TANGEDCO', 'Tamil Nadu Generation and Distribution Corporation', 'https://tangedco.gov.in', 'Recruitment of engineering and administrative personnel in Tamil Nadu power sector'),
  ('CEN', 'GATE_COMMITTEE', 'National Coordination Board - GATE (IITs & IISc)', 'https://gate2026.iitkgp.ac.in', 'National examination testing comprehensive understanding of undergraduate engineering and science'),
  ('CEN', 'IIM_CAT', 'Indian Institutes of Management (CAT Committee)', 'https://iimcat.ac.in', 'Premier computer-based entrance for postgraduate management programs across IIMs and top B-schools')
) AS a(scode, code, name, url, descr)
JOIN states s ON s.code = a.scode
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, website_url = EXCLUDED.website_url;

-- ── 2. Expanded Examinations ──────────────────────────────────────────────────
INSERT INTO exams (authority_id, category_id, code, title, slug, description, eligibility_summary)
SELECT auth.id, cat.id, e.code, e.title, e.slug, e.description, e.eligibility
FROM (VALUES
  -- Tamil Nadu Priority Ecosystem:
  ('TNPSC', 'State PSC', 'TNPSC_G1', 'TNPSC Combined Civil Services Examination I (Group I Services)', 'tnpsc-group-1',
   'Premier state administrative recruitment for Deputy Collector, Deputy Superintendent of Police (DSP), Assistant Commissioner (Commercial Taxes), and District Registrar.',
   'Bachelor degree from recognized university. Age 21-34 (relaxations for SC/ST/MBC/BC). Compulsory Tamil eligibility test.'),

  ('TNPSC', 'State PSC', 'TNPSC_G4', 'TNPSC Combined Civil Services Examination IV (Group IV & VAO)', 'tnpsc-group-4',
   'High-volume recruitment for Village Administrative Officer (VAO), Junior Assistant, Typist, and Steno-Typist in Tamil Nadu Ministerial and Judicial Services.',
   'SSLC (10th Standard) pass. Age 21-32/42 depending on category. Tamil SSLC standard qualification mandatory.'),

  ('TNUSRB', 'Police & Defence', 'TNUSRB_SI', 'TNUSRB Sub-Inspector of Police (Taluk, Armed Reserve, TSP)', 'tnusrb-si',
   'Recruitment for Sub-Inspector of Police in Tamil Nadu Police Subordinate Services.',
   'Any degree from UGC-recognized university. Physical endurance & measurement standards applicable. Tamil language test mandatory.'),

  ('TNUSRB', 'Police & Defence', 'TNUSRB_CONST', 'TNUSRB Grade II Police Constable, Jail Warder & Firemen', 'tnusrb-constable',
   'Entry-level uniformed cadre recruitment for Tamil Nadu Police, Prison and Fire & Rescue Services.',
   '10th standard (SSLC) pass with Tamil studied as one of the subjects. Physical fitness benchmarks apply.'),

  ('TRB', 'Teaching Exams', 'TNTET', 'Tamil Nadu Teacher Eligibility Test (TNTET Paper I & Paper II)', 'tntet',
   'Mandatory qualifying examination for primary (Classes I-V) and upper primary (Classes VI-VIII) school teachers in Tamil Nadu.',
   'Paper I: D.El.Ed / D.T.Ed; Paper II: B.Ed with relevant Bachelor degree. Minimum 50% marks in qualifying exams.'),

  ('TRB', 'Teaching Exams', 'TRB_PG', 'TRB Post Graduate Assistants & Physical Education Directors', 'trb-pg-assistant',
   'Recruitment for PG Assistant teachers in Government Higher Secondary Schools in Tamil Nadu.',
   'Post Graduate degree in relevant subject with B.Ed from recognized university.'),

  ('MRB', 'Medical Exams', 'MRB_AS', 'MRB Assistant Surgeon (General)', 'mrb-assistant-surgeon',
   'State recruitment for Assistant Surgeons in Tamil Nadu Medical Services.',
   'MBBS Degree registered with Tamil Nadu Medical Council.'),

  ('TANGEDCO', 'Engineering Exams', 'TANGEDCO_AE', 'TANGEDCO Assistant Engineer (Electrical & Electronics / Civil)', 'tangedco-ae',
   'Recruitment of Assistant Engineers in Tamil Nadu state electricity transmission and distribution grid.',
   'B.E. / B.Tech in Electrical & Electronics Engineering (EEE) or Civil Engineering. GATE scores / CBT selection.'),

  -- National Expansion:
  ('UPSC', 'Civil Services', 'UPSC_CSE', 'UPSC Civil Services Examination (IAS / IPS / IFS)', 'upsc-cse',
   'The highest constitutional recruitment examination in India for Indian Administrative Service, Indian Police Service, and Indian Foreign Service.',
   'Graduation in any discipline from recognized university. Age 21-32 years (with category relaxations). Max 6 attempts for general category.'),

  ('NTA', 'Medical Exams', 'NEET_UG', 'National Eligibility cum Entrance Test (NEET-UG)', 'neet-ug',
   'Single unified national entrance examination for admission to undergraduate MBBS, BDS, BAMS, BHMS and veterinary medical courses across India.',
   '10+2 with Physics, Chemistry, Biology/Biotechnology and English. Minimum age 17 years.'),

  ('GATE_COMMITTEE', 'Engineering Exams', 'GATE_CS', 'GATE Computer Science & Information Technology (CS)', 'gate-cs',
   'All-India benchmark examination for Master admissions (M.Tech/Ph.D.) at IITs, IISc, NITs and premier PSU recruitments (ISRO, BARC, IOCL).',
   'Currently studying in 3rd/final year or completed B.E./B.Tech/MCA/M.Sc in relevant field. No age restriction.'),

  ('IIM_CAT', 'Management Exams', 'CAT_IIM', 'Common Admission Test (IIM CAT)', 'cat-iim',
   'National computer-based entrance examination for MBA/PGDM programs across 21 Indian Institutes of Management (IIMs) and 100+ premier management institutes.',
   'Bachelor degree with at least 50% marks or equivalent CGPA (45% for SC/ST/PwD). Final-year candidates eligible.'),

  ('RRB', 'Railway Exams', 'RRB_NTPC', 'RRB Non-Technical Popular Categories (NTPC Graduate & Undergraduate)', 'rrb-ntpc',
   'Mass recruitment for Station Master, Goods Guard, Commercial Apprentice, Junior Clerk, and Accounts Clerk in Indian Railways zones.',
   '12th (+2) for Undergraduate posts; Bachelor degree for Graduate posts. Age 18-30/33 years.')
) AS e(auth_code, cat_name, code, title, slug, description, eligibility)
JOIN exam_authorities auth ON auth.code = e.auth_code
LEFT JOIN exam_categories cat ON cat.name = e.cat_name
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, eligibility_summary = EXCLUDED.eligibility_summary;

-- ── 3. Multi-Stage Patterns ──────────────────────────────────────────────────
INSERT INTO exam_stages (exam_id, stage_order, name, pattern_summary)
SELECT ex.id, st.s_order, st.name, st.pattern
FROM (VALUES
  ('tnpsc-group-1', 1, 'Preliminary Examination', 'Objective type: 200 questions, 300 marks, 3 hours. General Studies (175) + Aptitude and Mental Ability (25). Degree Standard.'),
  ('tnpsc-group-1', 2, 'Main Written Examination', 'Descriptive type: Paper I (Tamil Eligibility, 100 marks) + Paper II, III, IV (General Studies, 250 marks each). Total 750 marks.'),
  ('tnpsc-group-1', 3, 'Interview / Oral Test', 'Personality test assessing administrative suitability: 100 marks.'),
  ('tnpsc-group-4', 1, 'Single Stage Written Examination', 'Objective OMR/CBT: 200 questions, 300 marks, 3 hours. Part A (General Tamil, 100 Qs) + Part B (GS 75 Qs + Aptitude 25 Qs).'),
  ('tnusrb-si', 1, 'Written Examination (Paper I & II)', 'Part I: Tamil Eligibility Test (100 Qs, 100 marks). Part II: General Knowledge (80 Qs, 40 marks) + Psychology / Logical Analysis (60 Qs, 30 marks).'),
  ('tnusrb-si', 2, 'Physical Measurement & Endurance Test', 'Height & Chest Measurement; 1500m run (men in 7 mins) / 400m run (women). Physical efficiency tests (rope climbing, long jump).'),
  ('tntet', 1, 'Paper I (Primary: Classes I to V)', 'Objective CBT: 150 questions, 150 marks, 3 hours. CDP (30), Language I Tamil (30), Language II English (30), Maths (30), Environmental Studies (30).'),
  ('tntet', 2, 'Paper II (Upper Primary: Classes VI to VIII)', 'Objective CBT: 150 questions, 150 marks, 3 hours. CDP (30), Tamil (30), English (30), Mathematics & Science or Social Science (60).'),
  ('upsc-cse', 1, 'Civil Services Preliminary Examination', 'Two objective papers (200 marks each): Paper I (General Studies) determines cutoff; Paper II (CSAT) is qualifying at 33%. Negative marking 1/3rd.'),
  ('upsc-cse', 2, 'Civil Services Main Examination', '9 descriptive papers: 2 qualifying Indian Language & English papers (300 marks each) + 7 merit papers (Essay, GS I-IV, Optional I-II, 250 marks each). Total 1750 marks.'),
  ('upsc-cse', 3, 'Personality Test (Interview)', 'Board interview at UPSC Dholpur House, New Delhi: 275 marks. Grand total for final ranking: 2025 marks.'),
  ('neet-ug', 1, 'Unified Entrance Test', 'Pen-and-paper OMR test: 200 questions (180 to be attempted), 720 marks, 3 hours 20 mins. Physics (45), Chemistry (45), Biology (90). +4 correct, -1 incorrect.'),
  ('gate-cs', 1, 'Computer Based Test (CBT)', '65 questions, 100 marks, 180 mins. General Aptitude (15 marks) + Engineering Maths & Core CS (85 marks). MCQ, MSQ and NAT question formats.'),
  ('cat-iim', 1, 'Computer Based Test (CBT)', '66 questions, 198 marks, 120 mins (40 mins per section). Section 1: VARC (24), Section 2: DILR (20), Section 3: Quantitative Ability (22). +3 correct, -1 wrong.'),
  ('rrb-ntpc', 1, '1st Stage Computer Based Test (CBT 1)', 'Screening CBT: 100 questions, 100 marks, 90 mins. General Awareness (40), Mathematics (30), General Intelligence & Reasoning (30). Negative 1/3rd mark.'),
  ('rrb-ntpc', 2, '2nd Stage Computer Based Test (CBT 2)', 'Merit CBT: 120 questions, 120 marks, 90 mins. General Awareness (50), Mathematics (35), General Intelligence & Reasoning (35). Negative 1/3rd mark.')
) AS st(exam_slug, s_order, name, pattern)
JOIN exams ex ON ex.slug = st.exam_slug
ON CONFLICT (exam_id, stage_order) DO UPDATE SET pattern_summary = EXCLUDED.pattern_summary;

-- ── 4. Standardized Papers per Stage ──────────────────────────────────────────
INSERT INTO papers (stage_id, paper_number, title, duration_minutes, total_marks, negative_marking_ratio)
SELECT st.id, p.p_num, p.title, p.duration, p.total_marks, p.neg_ratio
FROM exam_stages st
JOIN exams ex ON st.exam_id = ex.id,
(VALUES
  ('upsc-cse', 1, 1, 'Paper I: General Studies (GS)', 120, 200.00, 0.33),
  ('upsc-cse', 1, 2, 'Paper II: Civil Services Aptitude Test (CSAT)', 120, 200.00, 0.33),
  ('tnpsc-group-1', 1, 1, 'Preliminary General Studies & Aptitude', 180, 300.00, 0.00),
  ('tnpsc-group-4', 1, 1, 'General Tamil + General Studies & Aptitude', 180, 300.00, 0.00),
  ('tnusrb-si', 1, 1, 'Part A: Tamil Eligibility Test', 100, 100.00, 0.00),
  ('tnusrb-si', 1, 2, 'Part B: General Knowledge & Psychology', 150, 70.00, 0.00),
  ('tntet', 1, 1, 'TNTET Paper I (Child Development, Tamil, English, Maths, EVS)', 180, 150.00, 0.00),
  ('neet-ug', 1, 1, 'NEET Unified Science Paper (Physics, Chemistry, Botany, Zoology)', 200, 720.00, 0.25),
  ('gate-cs', 1, 1, 'GATE CS: General Aptitude, Engineering Maths & CS Subjects', 180, 100.00, 0.33),
  ('cat-iim', 1, 1, 'CAT: VARC, DILR & Quantitative Ability', 120, 198.00, 0.33),
  ('rrb-ntpc', 1, 1, 'RRB NTPC CBT 1 (General Awareness, Maths & Reasoning)', 90, 100.00, 0.33)
) AS p(exam_slug, s_order, p_num, title, duration, total_marks, neg_ratio)
WHERE ex.slug = p.exam_slug AND st.stage_order = p.s_order
ON CONFLICT (stage_id, paper_number) DO UPDATE SET title = EXCLUDED.title, duration_minutes = EXCLUDED.duration_minutes;

-- ── 5. Versioned Syllabuses ───────────────────────────────────────────────────
INSERT INTO syllabuses (exam_id, stage_id, version_label, is_active, source_notification_url)
SELECT ex.id, st.id, '2026 Official Pattern', TRUE, 'https://gov.in/notifications/2026'
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id
WHERE st.stage_order = 1 AND ex.slug NOT IN ('tnpsc-group-2', 'ssc-cgl', 'ibps-po')
ON CONFLICT DO NOTHING;

-- ── 6. Reusable Cross-Exam Subject Mapping ─────────────────────────────────────
-- Maps shared subjects across exams to allow candidates to identify overlapping preparation areas
INSERT INTO exam_subject_map (exam_id, stage_id, subject_id, weightage_percent)
SELECT ex.id, st.id, s.id, sm.weightage
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id AND st.stage_order = 1
CROSS JOIN subjects s,
(VALUES
  ('upsc-cse', 'General Awareness', 50),
  ('upsc-cse', 'Quantitative Aptitude', 25),
  ('upsc-cse', 'English', 25),
  ('tnpsc-group-1', 'General Awareness', 60),
  ('tnpsc-group-1', 'Simplification', 20),
  ('tnpsc-group-1', 'Quantitative Aptitude', 20),
  ('tnpsc-group-4', 'General Awareness', 50),
  ('tnpsc-group-4', 'Simplification', 25),
  ('tnusrb-si', 'General Awareness', 50),
  ('tnusrb-si', 'Reasoning', 50),
  ('tntet', 'English', 30),
  ('tntet', 'Simplification', 30),
  ('rrb-ntpc', 'General Awareness', 40),
  ('rrb-ntpc', 'Quantitative Aptitude', 30),
  ('rrb-ntpc', 'Reasoning', 30),
  ('ssc-cgl', 'General Awareness', 25),
  ('ssc-cgl', 'Quantitative Aptitude', 25),
  ('ssc-cgl', 'Reasoning', 25),
  ('ssc-cgl', 'English', 25),
  ('ibps-po', 'Quantitative Aptitude', 35),
  ('ibps-po', 'Reasoning', 35),
  ('ibps-po', 'English', 30),
  ('cat-iim', 'Quantitative Aptitude', 35),
  ('cat-iim', 'Reasoning', 35),
  ('cat-iim', 'English', 30)
) AS sm(exam_slug, subj_name, weightage)
WHERE ex.slug = sm.exam_slug AND s.name = sm.subj_name
ON CONFLICT (exam_id, stage_id, subject_id) DO UPDATE SET weightage_percent = EXCLUDED.weightage_percent;

-- ── 7. Map Textbooks to Newly Seeded Exams ─────────────────────────────────────
INSERT INTO book_exam_map (book_id, exam_id, relevance_score)
SELECT bk.id, ex.id, 95
FROM books bk, exams ex
WHERE (bk.category = 'Tamil Nadu State Board' AND ex.slug IN ('tnpsc-group-1', 'tnpsc-group-4', 'tnusrb-si', 'tntet'))
   OR (bk.category = 'NCERT Textbooks' AND ex.slug IN ('upsc-cse', 'neet-ug', 'rrb-ntpc'))
   OR (bk.category = 'Open Educational Resources' AND ex.slug IN ('gate-cs', 'cat-iim', 'upsc-cse'))
ON CONFLICT (book_id, exam_id) DO NOTHING;

-- ── 8. Seed Previous Year Papers (PYQ) for Expanded Exams ─────────────────────
INSERT INTO pyq_papers (exam_id, stage_id, year, shift_session, language, title, original_paper_url, official_key_url, total_questions, is_verified, provenance_note)
SELECT ex.id, st.id, p.year, p.shift, p.lang, p.title, p.paper_url, p.key_url, p.total_q, TRUE, p.provenance
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id,
(VALUES
  ('upsc-cse', 1, 2024, 'Morning Session', 'Bilingual', 'UPSC Civil Services Prelims 2024 (General Studies Paper I)',
   'https://upsc.gov.in/sites/default/files/CSP-2024-GS-I.pdf', 'https://upsc.gov.in/examinations/answer-keys/csp2024', 100,
   'Commission final official answer key verified against gazette notification'),
  ('tnpsc-group-4', 1, 2024, 'Forenoon Session', 'Tamil & English', 'TNPSC Group IV Combined Services 2024 Original Question Paper',
   'https://tnpsc.gov.in/documents/2024/g4_final.pdf', 'https://tnpsc.gov.in/answerkeys/2024/g4_key.pdf', 200,
   'TNPSC Commission finalized key published after grievance redressal'),
  ('tnusrb-si', 1, 2023, 'Forenoon Session', 'Tamil & English', 'TNUSRB Sub-Inspector of Police Recruitment 2023 Original Paper',
   'https://tnusrb.tn.gov.in/pdf/si2023_main.pdf', 'https://tnusrb.tn.gov.in/si2023_final_key.pdf', 140,
   'Board validated official answer key with question challenge records')
) AS p(exam_slug, s_order, year, shift, lang, title, paper_url, key_url, total_q, provenance)
WHERE ex.slug = p.exam_slug AND st.stage_order = p.s_order
ON CONFLICT DO NOTHING;
