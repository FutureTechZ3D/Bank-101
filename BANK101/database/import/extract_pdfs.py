"""
Step 1 of the question-bank import: read the quiz PDFs and write EVERYTHING that can be parsed to candidates.json.
Nothing is trusted here: questions whose text lost its fractions/roots (they are images in the PDFs), blank options, etc.
are kept in the file and rejected in step 2 (verify.py) with a reason.

Run:  python extract_pdfs.py            (reads ../DBMS/BANK EXAMS/Simplification/Part 1/Simplification_Quiz_*.pdf)
Needs: pypdf (pip install pypdf). Read-only on the PDFs. Use PYTHONIOENCODING=utf-8 on Windows consoles.
"""
import glob
import json
import os
import re
import sys

import pypdf

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'DBMS', 'BANK EXAMS', 'Simplification', 'Part 1')
OUT = os.path.join(HERE, 'candidates.json')

LABELS = ['A', 'B', 'C', 'D', 'E']
KEY_HEADER = re.compile(r'Correct\s+Answers?\s*:', re.I)
EXPL_HEADER = re.compile(r'Explanations?\s*:', re.I)


def norm(s: str) -> str:
    s = s.replace(' ', ' ').replace('−', '-').replace('–', '-').replace('—', '-')
    return re.sub(r'\s+', ' ', s).strip()


def read_pdf(path):
    r = pypdf.PdfReader(path)
    return '\n'.join(p.extract_text() or '' for p in r.pages), len(r.pages)


def parse_key(after_key: str, n_questions: int):
    """'Correct Answers: 1 2 3 ... B D E ...' -> (how many numbers, ['B','D','E',...]).
    Only the block before 'Explanation(s):' or a repeated 'Correct answer:' is read (footers contain stray letters)."""
    head = re.split(r'Explanations?\s*:|Correct\s+Answers?\s*:', after_key, maxsplit=1, flags=re.I)[0]
    head = norm(head)
    nums = re.findall(r'\b\d{1,2}\b', head)
    run = re.search(r'((?:\b[A-E]\b\s*){%d})' % max(n_questions, 1), head)
    letters = re.findall(r'\b([A-E])\b', run.group(1)) if run else re.findall(r'\b([A-E])\b', head)
    return len(nums), letters


def parse_questions(body: str):
    """[{number, text, options{A..E}, raw}] from the 'N. text  A. ..  B. ..' layout."""
    blocks, cur = [], None
    for ln in body.split('\n'):
        m = re.match(r'^\s*(\d{1,2})\.\s*(.*)$', ln)
        expected = (cur['number'] + 1) if cur else 1
        if m and int(m.group(1)) == expected:  # a new question starts with the next expected number
            cur = {'number': int(m.group(1)), 'lines': [m.group(2)]}
            blocks.append(cur)
        elif cur is not None:
            cur['lines'].append(ln)
    out = []
    for b in blocks:
        raw = norm(' '.join(b['lines']))
        m = re.search(r'\bA\.\s*(.*?)\s+B\.\s*(.*?)\s+C\.\s*(.*?)\s+D\.\s*(.*?)\s+E\.\s*(.*)$', raw) or re.search(
            r'\bA\.\s*(.*?)\s*B\.\s*(.*?)\s*C\.\s*(.*?)\s*D\.\s*(.*?)\s*E\.\s*(.*)$', raw)
        if m:
            qtext = norm(raw[: m.start()])
            options = {LABELS[i]: norm(m.group(i + 1)) for i in range(5)}
        else:
            qtext, options = raw, {}
        out.append({'number': b['number'], 'text': qtext, 'options': options, 'raw': raw})
    return out


def parse_explanations(expl_part: str):
    expl = {}
    parts = re.split(r'(?m)^\s*(\d{1,2})\.\s', expl_part)  # [pre, '1', text1, '2', text2, ...]
    for i in range(1, len(parts) - 1, 2):
        expl[int(parts[i])] = norm(parts[i + 1])
    return expl


def main():
    files = sorted(glob.glob(os.path.join(SRC, 'Simplification_Quiz_*.pdf')), key=lambda f: int(re.search(r'_(\d+)\.pdf$', f).group(1)))
    quizzes = []
    for f in files:
        qn = int(re.search(r'_(\d+)\.pdf$', f).group(1))
        text, pages = read_pdf(f)
        km = KEY_HEADER.search(text)
        if not km:
            quizzes.append({'quiz': qn, 'file': os.path.basename(f), 'pages': pages, 'error': 'no "Correct Answer(s):" section', 'questions': []})
            continue
        body, rest = text[: km.start()], text[km.end():]
        body = re.sub(r'^.*?Directions?:[^\n]*\n', '', body, flags=re.S)
        body = '\n'.join(l for l in body.split('\n') if 'smartkeeda' not in l.lower() and 'Simplification Questions for' not in l and not re.match(r'^\s*Simplification Quiz \d+\s*$', l))
        questions = parse_questions(body)
        n_keys, letters = parse_key(rest, len(questions))
        em = EXPL_HEADER.search(rest)
        if em:
            expl_part = rest[em.end():]
        else:
            m2 = KEY_HEADER.search(rest)  # some PDFs repeat "Correct answer:" as the explanations header
            expl_part = rest[m2.end():] if m2 else ''
        expl = parse_explanations(expl_part)
        for i, q in enumerate(questions):
            q['key'] = letters[i] if i < len(letters) else None
            q['explanation'] = expl.get(q['number'], '')
        quizzes.append({'quiz': qn, 'file': os.path.basename(f), 'pages': pages, 'n_keys': n_keys, 'keys': letters, 'questions': questions})
    json.dump({'source': 'database/DBMS/BANK EXAMS/Simplification/Part 1', 'quizzes': quizzes}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    total = sum(len(q['questions']) for q in quizzes)
    print(f'{len(quizzes)} PDFs, {total} question blocks -> {OUT}')


if __name__ == '__main__':
    sys.exit(main())
