"""
Tests for the question-bank verifier (run:  cd database/import && python -m unittest -v test_verify).
They prove the verifier REJECTS damaged / wrong-key questions (negative controls) and that every importable question
also passes a SECOND, independently written oracle (Python's own expression evaluator on exact fractions).
"""
import json
import os
import re
import unittest
from fractions import Fraction

import verify
from verify import Reject, check_question, solve

HERE = os.path.dirname(os.path.abspath(__file__))


def q(text, options, key, expl=None):
    """Build a question; the default explanation repeats the question and ends at the key option's value (as the PDFs do)."""
    if expl is None:
        val = options[key] if key in options else ''
        expl = f'Given expression = {text} ... = {val}. Hence, option {key} is correct.'
    return {'text': text, 'options': options, 'key': key, 'explanation': expl}


def opts(a, b, c, d, e='None of these'):
    return {'A': a, 'B': b, 'C': c, 'D': d, 'E': e}


class SolverTests(unittest.TestCase):
    def test_value_questions_and_precedence(self):
        self.assertEqual(solve(q('5004 ÷ 139 - 6 = ?', opts('24', '30', '36', '42'), 'B'))[0], 'B')
        self.assertEqual(solve(q('2 + 3 × 4 = ?', opts('20', '14', '24', '10'), 'B'))[0], 'B')  # × before +
        self.assertEqual(solve(q('100 ÷ 10 ÷ 2 = ?', opts('5', '20', '50', '1'), 'A'))[0], 'A')  # left to right
        self.assertEqual(solve(q('- 224 + (- 314) × (- 9) = ?', opts('-547', '2602', '547', '-2602'), 'B'))[0], 'B')

    def test_percent_of_brackets_implicit_multiplication_and_roots(self):
        self.assertEqual(solve(q('45% of 600 + 150% of 240 - 25% of 400 = ?', opts('530', '550', '510', '490'), 'A'))[0], 'A')
        self.assertEqual(solve(q('2 - [ 2 - { 2 - 2 ( 2 + 2 ) } ] = ?', opts('-4', '4', '6', '-6'), 'D'))[0], 'D')
        self.assertEqual(solve(q('√961 + 9 = ?', opts('30', '40', '50', '60'), 'B'))[0], 'B')

    def test_equations_are_solved_by_substituting_each_option(self):
        self.assertEqual(solve(q('98643 - 21748 = 51212 + ?', opts('24383', '24713', '25683', '25973'), 'C'))[0], 'C')
        self.assertEqual(solve(q('5 × √? = 735 ÷ 3', opts('7', '49', '2401', '98'), 'C'))[0], 'C')
        self.assertEqual(solve(q('?% of (140 × 8 - 680) = 330', opts('65', '70', '72', '75'), 'D'))[0], 'D')

    def test_none_of_these_and_five_numeric_options(self):
        self.assertEqual(solve(q('94736 + 43693 + 25638 = ?', opts('160546', '164076', '165046', '160467'), 'E'))[0], 'E')
        self.assertEqual(solve(q('13 + ? × (4.5 ÷ 6) × (3 - 1.8) = 31', opts('18', '36', '2', '25', '20'), 'E'))[0], 'E')

    def test_check_question_accepts_a_complete_correct_question(self):
        self.assertEqual(check_question(q('5004 ÷ 139 - 6 = ?', opts('24', '30', '36', '42'), 'B')), 'B')


class RejectionTests(unittest.TestCase):
    def rejected(self, question, code):
        with self.assertRaises(Reject) as cm:
            check_question(question)
        self.assertEqual(cm.exception.code, code, cm.exception)

    def test_wrong_key_is_rejected(self):
        self.rejected(q('2 + 2 = ?', opts('3', '4', '5', '6'), 'C', 'Given expression = 2 + 2 = 5. Hence, option C is correct.'), 'DISAGREE')

    def test_wrong_key_that_the_explanation_contradicts_is_reported_as_suspect(self):
        self.rejected(q('2 + 2 = ?', opts('3', '4', '5', '6'), 'C', 'Given expression = 2 + 2 = 4. Hence, option B is correct.'), 'SUSPECT_KEY')

    def test_fraction_lost_from_the_text(self):
        self.rejected(q('of 168 × 15 ÷ 5 + ? = 549 ÷ 9 + 235', opts('107', '170', '296', '275'), 'A'), 'BAD_TEXT')

    def test_exponent_flattened_into_digits(self):
        self.rejected(q('(38)2 + (63)2 + (?)2 = 6089', opts('26', '24', '28', '32'), 'A'), 'BAD_TEXT')
        self.rejected(q('63 × 34 ÷ 93 + ?2 = 72', opts('4', '7', '5', '6'), 'A'), 'BAD_TEXT')

    def test_math_styled_unicode_and_empty_text_and_approximation(self):
        self.rejected(q('𝟒 𝟗 × 1701 + 𝟐 𝟏𝟏 × 1386 = ?', opts('180', '1080', '1008', '1800'), 'C'), 'BAD_TEXT')
        self.rejected(q('', opts('112', '116', '240', '663'), 'A'), 'BAD_TEXT')
        self.rejected(q('(780.85 + 59.98) ÷ 29.02 ≈ ?', opts('29', '27', '19', '21'), 'A'), 'BAD_TEXT')

    def test_blank_or_non_numeric_options(self):
        self.rejected(q('2 + 2 = ?', opts('', '4', '5', '6'), 'B'), 'BAD_OPTIONS')
        self.rejected(q('2 + 2 = ?', opts('3 7', '4', '5', '6'), 'B'), 'BAD_OPTIONS')

    def test_none_of_these_needs_proof_from_the_explanation(self):
        # a damaged question also looks like "no option matches": it must NOT be accepted on that alone
        self.rejected(q('2 + 2 = ?', opts('3', '5', '6', '7'), 'E', 'Given expression = 2 + 2 = 9. Hence, option E is correct.'), 'E_UNPROVEN')

    def test_explanation_that_does_not_repeat_the_question_is_not_trusted(self):
        # REGRESSION: found while building the importer. The real question had mixed fractions (images) that were missing
        # from the question text; the plain remainder "6 - 5 + 2 = ? + 6 - 5" happened to match the key. The explanation
        # showed the real numbers, so the restatement check catches it.
        damaged = q('6 - 5 + 2 = ? + 6 - 5', opts('6', '2', '11', '4', '5'), 'B',
                    '6 7 - 5 4 + 2 11 = ? + 6 11 - 5 2 8 3 5 7 7 ... ? = 2 383 840 Hence, option B is correct.')
        self.rejected(damaged, 'UNCONFIRMED')


# ---------------------------------------------------------------- second oracle: Python's evaluator on exact fractions
def py_value(expr: str, x=None) -> Fraction:
    e = expr.replace('[', '(').replace(']', ')').replace('{', '(').replace('}', ')').replace('−', '-').replace('–', '-')
    e = re.sub(r'(\d+(?:\.\d+)?|\?)\s*%', r'(\1/100)', e)
    e = re.sub(r'\bof\b', '*', e).replace('×', '*').replace('÷', '/')
    e = re.sub(r'√\s*(\d+(?:\.\d+)?|\?|\([^()]*\))', r'ROOT(\1)', e)
    e = re.sub(r'(\d+(?:\.\d+)?)', r'F("\1")', e)
    e = re.sub(r'\)\s*\(', ')*(', e)
    e = e.replace('?', 'X')
    e = re.sub(r'(X)\s*\(', r'\1*(', e)  # "? (44 + 35)" = unknown times a bracket

    def root(v):
        n = Fraction(v)
        import math
        rn, rd = math.isqrt(n.numerator), math.isqrt(n.denominator)
        assert rn * rn == n.numerator and rd * rd == n.denominator
        return Fraction(rn, rd)

    return Fraction(eval(e, {'__builtins__': {}}, {'F': Fraction, 'X': x, 'ROOT': root}))


def satisfies(lhs: str, rhs: str, x: Fraction) -> bool:
    """Does the option make the equation true? A candidate that breaks the maths (e.g. root of a non-square) is simply not it."""
    try:
        return py_value(lhs, x) == py_value(rhs, x)
    except (AssertionError, ZeroDivisionError, TypeError):
        return False


class SecondOracleOnImportableData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = json.load(open(os.path.join(HERE, 'verified.json'), encoding='utf-8'))
        cls.questions = [(z['quiz_name'], x) for z in data['quizzesData'] for x in z['questions']]

    def test_there_is_data_to_check(self):
        self.assertGreater(len(self.questions), 50)

    def test_every_importable_question_also_passes_python_eval(self):
        bad = []
        for name, x in self.questions:
            text = x['question']
            correct = x['options'][x['correct_option']]
            none = x['options']['E'].lower() == 'none of these'
            labels = 'ABCD' if none else 'ABCDE'
            vals = {L: Fraction(x['options'][L]) for L in labels}
            m = re.fullmatch(r'(.*?)=\s*\?\s*', text)
            try:
                if m and '?' not in m.group(1):
                    v = py_value(m.group(1))
                    hit = [L for L in labels if vals[L] == v]
                else:
                    lhs, rhs = text.split('=')
                    hit = [L for L in labels if satisfies(lhs, rhs, vals[L])]
                got = hit[0] if len(hit) == 1 else ('E' if (not hit and none) else None)
            except Exception as e:  # noqa: BLE001
                got = f'ERR {e}'
            if got != x['correct_option']:
                bad.append((name, text, x['correct_option'], got))
        self.assertEqual(bad, [], f'{len(bad)} questions disagree with the second oracle: {bad[:3]}')

    def test_negative_control_every_wrong_key_is_rejected(self):
        accepted = []
        for name, x in self.questions:
            for wrong in 'ABCDE':
                if wrong == x['correct_option']:
                    continue
                cand = {'text': x['question'], 'options': x['options'], 'key': wrong, 'explanation': x['source_explanation']}
                try:
                    check_question(cand)
                    accepted.append((name, x['question'], wrong))
                except Reject:
                    pass
        self.assertEqual(accepted, [], f'wrong keys accepted: {accepted[:3]}')

    def test_no_question_is_duplicated_and_all_have_five_options(self):
        texts = [re.sub(r'\s+', ' ', x['question']) for _, x in self.questions]
        self.assertEqual(len(texts), len(set(texts)))
        for _, x in self.questions:
            self.assertEqual(sorted(x['options']), list('ABCDE'))
            self.assertIn(x['correct_option'], 'ABCDE')


if __name__ == '__main__':
    unittest.main()
