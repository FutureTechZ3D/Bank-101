"""
Step 2 of the question-bank import: INDEPENDENT verification of every candidate question.

The answer key in the PDF is NOT trusted. For each question we parse the arithmetic ourselves (exact rational maths,
no eval) and compute which option is right:
  * "expression = ?"  -> compute the value and look for it among the options
  * equation with ?   -> substitute each option into the equation and see which one makes it true
  * layout 1: options A-D are numbers and E is "None of these"; layout 2: five numeric options A-E
A question is VERIFIED only when our result equals the PDF key. Everything else is rejected with a reason:
  SUSPECT_KEY   our calculation AND the PDF's own explanation agree, the key does not -> suspected wrong key (listed for the owner)
  DISAGREE      our result differs from the key without support (usually damaged text) -> rejected
  UNCONFIRMED   the PDF explanation does not repeat the question exactly / ends at another value (extraction damage not excluded)
  E_UNPROVEN    key "None of these" without proof (a damaged question also looks like "none match") -> rejected
  BAD_TEXT      the question lost fractions / exponents / roots in the PDF text (they are images or flattened)
  BAD_OPTIONS   an option is blank or not a plain number (fractions, mixed numbers)
  NO_KEY / PARSE / DUPLICATE / FILE_REJECTED

Run:  python verify.py          (reads candidates.json, writes verified.json, report.json, REPORT.md)
"""
import json
import math
import os
import re
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = ['A', 'B', 'C', 'D']


class Reject(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code = code


# ---------------------------------------------------------------- tokenizer / parser
TOKEN = re.compile(r'\s*(?:(\d+(?:\.\d+)?)|(of)\b|([+\-×÷%()?=√]))')


def tokenize(text: str):
    t = text.replace('[', '(').replace(']', ')').replace('{', '(').replace('}', ')').replace('−', '-').replace('–', '-').strip()
    pos, out = 0, []
    while pos < len(t):
        m = TOKEN.match(t, pos)
        if not m or m.end() == pos:
            raise Reject('BAD_TEXT', f'unreadable character near {t[pos:pos + 8]!r}')
        if m.group(1) is not None:
            out.append(('num', Fraction(m.group(1))))
        elif m.group(2):
            out.append(('op', '×'))  # "x of y" multiplies
        else:
            out.append(('op', m.group(3)))
        pos = m.end()
        while pos < len(t) and t[pos] == ' ':
            pos += 1
    return out


class Parser:
    def __init__(self, tokens, x=None):
        self.t, self.i, self.x = tokens, 0, x

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def eat(self, op=None):
        tok = self.peek()
        if tok is None or (op is not None and tok != ('op', op)):
            raise Reject('PARSE', f'expected {op}')
        self.i += 1
        return tok

    def parse(self):
        v = self.expr()
        if self.peek() is not None:
            raise Reject('PARSE', f'unexpected {self.peek()}')
        return v

    def expr(self):
        v = self.term()
        while self.peek() in (('op', '+'), ('op', '-')):
            op = self.eat()[1]
            r = self.term()
            v = v + r if op == '+' else v - r
        return v

    def term(self):
        v = self.unary()
        while True:
            tok = self.peek()
            if tok in (('op', '×'), ('op', '÷')):
                self.eat()
                r = self.unary()
                if tok[1] == '×':
                    v = v * r
                else:
                    if r == 0:
                        raise Reject('PARSE', 'division by zero')
                    v = v / r
            elif tok == ('op', '('):  # implicit multiplication: 2 ( 2 + 2 )
                v = v * self.unary()
            else:
                return v

    def unary(self):
        tok = self.peek()
        if tok == ('op', '-'):
            self.eat()
            return -self.unary()
        if tok == ('op', '+'):
            self.eat()
            return self.unary()
        return self.postfix()

    def postfix(self):
        v = self.atom()
        while self.peek() == ('op', '%'):
            self.eat()
            v = v / 100
        return v

    def atom(self):
        tok = self.peek()
        if tok is None:
            raise Reject('PARSE', 'unexpected end')
        if tok[0] == 'num':
            self.i += 1
            return tok[1]
        if tok == ('op', '?'):
            self.i += 1
            if self.x is None:
                raise Reject('PARSE', 'unknown without a value')
            return self.x
        if tok == ('op', '('):
            self.eat('(')
            v = self.expr()
            self.eat(')')
            return v
        if tok == ('op', '√'):
            self.eat()
            return exact_sqrt(self.atom())
        raise Reject('PARSE', f'unexpected {tok}')


def exact_sqrt(v: Fraction) -> Fraction:
    if v < 0:
        raise Reject('PARSE', 'sqrt of negative')
    n, d = v.numerator, v.denominator
    rn, rd = math.isqrt(n), math.isqrt(d)
    if rn * rn != n or rd * rd != d:
        raise Reject('PARSE', 'irrational root (approximation question)')
    return Fraction(rn, rd)


# ---------------------------------------------------------------- text / option checks
ALLOWED_TEXT = re.compile(r'^[0-9\s.+\-×÷%()\[\]{}?=√]*(?:of[0-9\s.+\-×÷%()\[\]{}?=√]*)*$')


def check_text(text: str):
    if not text.strip():
        raise Reject('BAD_TEXT', 'empty question text (the expression was an image)')
    if any(ord(c) > 0x2000 for c in text if c not in '÷×√–−'):
        raise Reject('BAD_TEXT', 'math-styled characters (fractions/exponents flattened by the PDF)')
    if '≈' in text:
        raise Reject('BAD_TEXT', 'approximation question')
    if re.search(r'\)\s*\d', text) or re.search(r'\d\s+\d', text) or re.search(r'\d\s*\?|\?\s*\d', text):
        raise Reject('BAD_TEXT', 'digits run together (a fraction or exponent lost its layout)')
    if re.match(r'^\s*of\b', text) or re.search(r'[+\-×÷=(]\s*of\b', text):
        raise Reject('BAD_TEXT', '"of" with a missing left operand (a fraction is missing)')
    if not ALLOWED_TEXT.match(text):
        raise Reject('BAD_TEXT', 'contains words or symbols outside plain arithmetic')
    if text.count('(') != text.count(')') + 0 and text.count('[') != text.count(']'):
        raise Reject('BAD_TEXT', 'unbalanced brackets')


def option_value(txt: str):
    # A space is allowed only between a sign and the digits ("- 4"). "3 7" is a flattened fraction 3/7, never the number 37.
    t = txt.strip().replace('−', '-').replace('–', '-')
    m = re.fullmatch(r'([+-])?\s*(\d+(?:\.\d+)?)', t)
    if m:
        return Fraction(('-' if m.group(1) == '-' else '') + m.group(2))
    raise Reject('BAD_OPTIONS', f'option {txt!r} is blank or not a plain number')


def evaluate(text: str):
    """-> ('value', Fraction) for "expr = ?"   or   ('equation', callable x -> bool)"""
    check_text(text)
    t = text.strip()
    m = re.fullmatch(r'(.*?)=\s*\?\s*', t)
    if m and '?' not in m.group(1):
        return 'value', Parser(tokenize(m.group(1))).parse()
    if t.count('=') != 1 or '?' not in t:
        raise Reject('PARSE', 'not an expression with = ? and not an equation with an unknown')
    lhs, rhs = t.split('=')
    ltok, rtok = tokenize(lhs), tokenize(rhs)

    def holds(x):
        try:
            return Parser(ltok, x).parse() == Parser(rtok, x).parse()
        except Reject:
            return False

    return 'equation', holds


def solve(q):
    """-> (letter A-E that is correct by OUR calculation, computed value or None)."""
    kind, res = evaluate(q['text'])
    opts = q['options']
    none_layout = str(opts.get('E', '')).strip().lower() == 'none of these'
    labels = LABELS if none_layout else LABELS + ['E']
    vals = {L: option_value(opts.get(L, '')) for L in labels}
    if len(set(vals.values())) != len(vals):
        raise Reject('BAD_OPTIONS', 'two options have the same value')
    if kind == 'value':
        hit = [L for L in labels if vals[L] == res]
        value = res
    else:
        hit = [L for L in labels if res(vals[L])]
        value = None
    if len(hit) > 1:
        raise Reject('PARSE', 'more than one option satisfies the question')
    if hit:
        return hit[0], value
    if none_layout:
        return 'E', value
    raise Reject('DISAGREE', 'no option satisfies the question (the text may be damaged)')


def explanation_value(expl: str):
    """The FIRST number after the last '=' (or arrow) of the PDF explanation, before 'Hence, option X is correct'.
    (Fractions are flattened into digit runs, e.g. "= 11080 4" is 11080 over 4, so the first number is the safe one.)"""
    head = re.split(r'Hence', expl, maxsplit=1)[0].replace('−', '-').replace('–', '-')
    tail = re.split(r'[=⇒≈]', head)[-1]
    nums = re.findall(r'-?\d+(?:\.\d+)?', tail)
    return Fraction(nums[0]) if nums else None


def squash(s: str) -> str:
    return re.sub(r'\s+', '', s.replace('−', '-').replace('–', '-').replace('x', '×'))


def restated(q) -> bool:
    """The PDF's own explanation normally starts by repeating the question. If the repeated text is not identical to the
    extracted question, the extraction lost something (a fraction image, an exponent...) and the question is not trusted."""
    qn, en = squash(q['text']), squash(q.get('explanation', ''))
    return bool(qn) and qn in en[: len(qn) + 70]


def check_question(q):
    """Raises Reject unless the question is independently verified. Returns the letter we computed."""
    mine, value = solve(q)
    ev = explanation_value(q.get('explanation', ''))
    if mine != q['key']:
        opt_val = None
        if str(q['options'].get(mine, '')).lower() != 'none of these':
            try:
                opt_val = option_value(q['options'][mine])
            except Reject:
                pass
        if opt_val is not None and ev is not None and ev == opt_val:
            raise Reject('SUSPECT_KEY', f'PDF key {q["key"]}, but our calculation AND the PDF explanation both give {mine} ({opt_val})')
        raise Reject('DISAGREE', f'PDF key {q["key"]} but our calculation gives {mine}; the explanation does not back it up (text may be damaged)')
    if mine == 'E' and str(q['options'].get('E', '')).lower() == 'none of these':
        if value is None or ev is None or ev != value:
            raise Reject('E_UNPROVEN', '"None of these" is accepted only when the explanation reaches the same value as our calculation')
    if not restated(q):
        raise Reject('UNCONFIRMED', 'the PDF explanation does not repeat the question exactly, so the extracted text cannot be trusted (a fraction/exponent may be missing)')
    if mine != 'E' or str(q['options'].get('E', '')).lower() != 'none of these':
        if ev is None or ev != option_value(q['options'][mine]):
            raise Reject('UNCONFIRMED', 'the PDF explanation ends at a different value than the chosen option')
    q['_value'] = value
    return mine


def fmt(v) -> str:
    v = Fraction(v)
    if v.denominator == 1:
        return str(v.numerator)
    return ('%.6f' % float(v)).rstrip('0').rstrip('.')


def make_explanation(q) -> str:
    """A clean explanation generated from OUR verified calculation. The PDF explanations are not used: their fractions are
    flattened into digit runs ("= 11080 4") which would mislead students."""
    mine, value = q['_computed'], q.get('_value')
    if value is not None:
        if mine == 'E' and str(q['options'].get('E', '')).lower() == 'none of these':
            return f'Evaluating the expression gives {fmt(value)}. That value is not among options A-D, so the answer is E (None of these).'
        return f'Evaluating the expression gives {fmt(value)}, which is option {mine}.'
    opt = q['options'][mine]
    return f'Putting option {mine} ({opt}) in place of ? makes both sides of the equation equal, and no other option does.'


# ---------------------------------------------------------------- main
def main():
    cand = json.load(open(os.path.join(HERE, 'candidates.json'), encoding='utf-8'))
    report, verified_quizzes, counts, seen = [], [], {}, {}

    def count(status):
        counts[status] = counts.get(status, 0) + 1

    for qz in cand['quizzes']:
        if qz.get('error'):
            report.append({'quiz': qz['quiz'], 'question': None, 'status': 'FILE_REJECTED', 'reason': qz['error']})
            count('FILE_REJECTED')
            continue
        ok_questions = []
        for q in qz['questions']:
            row = {'quiz': qz['quiz'], 'question': q['number'], 'text': q['text'], 'key': q.get('key')}
            try:
                if not q.get('key') or q['key'] not in 'ABCDE':
                    raise Reject('NO_KEY', 'no answer key letter')
                if len(qz['keys']) != len(qz['questions']):
                    raise Reject('NO_KEY', f'{len(qz["keys"])} keys for {len(qz["questions"])} questions (cannot align)')
                mine = check_question(q)
                q['_computed'] = mine
                row['computed'] = mine
                norm_text = re.sub(r'\s+', ' ', q['text'])
                if norm_text in seen:
                    raise Reject('DUPLICATE', f'same question as quiz {seen[norm_text][0]} question {seen[norm_text][1]}')
                seen[norm_text] = (qz['quiz'], q['number'])
                row['status'] = 'VERIFIED'
                ok_questions.append(q)
            except Reject as e:
                row['status'], row['reason'] = e.code, str(e)
            count(row['status'])
            report.append(row)
        if ok_questions:
            verified_quizzes.append({'quiz': qz['quiz'], 'file': qz['file'], 'questions': ok_questions})

    def clean_opt(s):
        return 'None of these' if s.lower() == 'none of these' else re.sub(r'\s+', '', s.replace('−', '-').replace('–', '-')).lstrip('+')

    out = []
    for z in verified_quizzes:
        out.append({
            'quiz_name': f'Simplification Quiz {z["quiz"]}',
            'source_file': z['file'],
            'questions': [{
                'question': re.sub(r'\s+', ' ', q['text']).replace('( ', '(').replace(' )', ')').strip(),
                'options': {L: clean_opt(q['options'][L]) for L in 'ABCDE'},
                'correct_option': q['key'],
                'explanation': make_explanation(q),
                'source_explanation': q['explanation'],
            } for q in z['questions']],
        })
    json.dump({'topic': 'Simplification Practice', 'quizzesData': out}, open(os.path.join(HERE, 'verified.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'counts': counts, 'rows': report}, open(os.path.join(HERE, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    total = sum(counts.values())
    n_ok = counts.get('VERIFIED', 0)
    lines = ['# Question-bank import report (Simplification, 57 PDFs)', '', f'Candidates examined: {total}', '', '| Status | Count |', '|---|---|']
    for k in sorted(counts, key=lambda k: -counts[k]):
        lines.append(f'| {k} | {counts[k]} |')
    lines += ['', f'Importable (independently verified): **{n_ok}** questions in **{len(out)}** quizzes.', '',
              "## Suspected wrong answer keys in the source PDFs (SUSPECT_KEY: our calculation and the PDF's own explanation agree with each other, not with the key)", '',
              '| Quiz | Q | Question | PDF key | Our result |', '|---|---|---|---|---|']
    for r in report:
        if r['status'] == 'SUSPECT_KEY':
            lines.append(f"| {r['quiz']} | {r['question']} | {r['text']} | {r['key']} | {r['computed']} |")
    open(os.path.join(HERE, 'REPORT.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(json.dumps(counts, indent=1), f'\nimportable: {n_ok} questions in {len(out)} quizzes')


if __name__ == '__main__':
    sys.exit(main())
