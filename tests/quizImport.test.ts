import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseQuizImport } from '@/lib/quizImport';

const q = (over: Record<string, unknown> = {}) => ({
  text: 'Where is the apple?',
  image: '',
  answers: [
    { text: 'Apple', image: '', correct: true },
    { text: 'Banana', image: '', correct: false },
  ],
  ...over,
});
const run = (questions: unknown) => parseQuizImport(JSON.stringify({ questions }));

describe('parseQuizImport', () => {
  it('accepts the shipped template', () => {
    const r = parseQuizImport(readFileSync('public/quiz-template.json', 'utf8'));
    expect(r.errors).toEqual([]);
    expect(r.questions).toHaveLength(2);
    expect(r.questions[1].count).toBe(2);
    expect(r.questions[1].correct).toBe(1);
  });

  it('maps a valid question, with blank images as null', () => {
    const r = run([q()]);
    expect(r.errors).toEqual([]);
    const [a] = r.questions;
    expect(a.text).toBe('Where is the apple?');
    expect(a.qimg).toBeNull();
    expect(a.imgs).toEqual([null, null, null]);
    expect(a.texts.slice(0, 2)).toEqual(['Apple', 'Banana']);
    expect(a.correct).toBe(0);
    expect(a.count).toBe(2);
    expect(a.readAnswers).toBe(true);
    expect(a.voice).toBeNull();
  });

  it('accepts https image links and a bare array', () => {
    const r = parseQuizImport(JSON.stringify([q({ image: ' https://example.com/q.svg ', answers: [
      { image: 'https://example.com/a.svg', correct: true }, { correct: false }, { correct: false },
    ] })]));
    expect(r.errors).toEqual([]);
    expect(r.questions[0].qimg).toBe('https://example.com/q.svg');
    expect(r.questions[0].imgs[0]).toBe('https://example.com/a.svg');
    expect(r.questions[0].count).toBe(3);
  });

  it('honours readAnswersAloud: false', () => {
    expect(run([q({ readAnswersAloud: false })]).questions[0].readAnswers).toBe(false);
  });

  it('rejects invalid JSON and a missing list', () => {
    expect(parseQuizImport('{nope').errors[0]).toMatch(/not valid JSON/);
    expect(parseQuizImport('{}').errors[0]).toMatch(/"questions" list/);
    expect(run([]).errors[0]).toMatch(/empty/);
  });

  it('rejects more than 50 questions', () => {
    expect(run(Array.from({ length: 51 }, () => q())).errors[0]).toMatch(/Too many/);
  });

  it('needs 2 or 3 answers', () => {
    expect(run([q({ answers: [{ correct: true }] })]).errors).toEqual(['Question 1: needs 2 or 3 answers.']);
    const four = Array.from({ length: 4 }, (_, i) => ({ correct: i === 0 }));
    expect(run([q({ answers: four })]).errors).toEqual(['Question 1: needs 2 or 3 answers.']);
  });

  it('needs exactly one correct answer', () => {
    const none = run([q({ answers: [{ correct: false }, { correct: false }] })]);
    expect(none.errors[0]).toMatch(/exactly one answer.*found 0/);
    const two = run([q({ answers: [{ correct: true }, { correct: true }] })]);
    expect(two.errors[0]).toMatch(/found 2/);
  });

  it('only allows blank or https image links', () => {
    expect(run([q({ image: 'http://example.com/a.png' })]).errors[0]).toMatch(/https:\/\//);
    expect(run([q({ image: 'seed/apple.svg' })]).errors[0]).toMatch(/blank or a link/);
    expect(run([q({ image: 'data:image/png;base64,AAAA' })]).errors[0]).toMatch(/blank or a link/);
    expect(run([q({ image: 5 })]).errors[0]).toMatch(/must be text/);
    const bad = run([q({ answers: [{ image: 'ftp://x', correct: true }, { correct: false }] })]);
    expect(bad.errors[0]).toMatch(/^Question 1, answer 1:/);
  });

  it('reports every problem with its question number and imports nothing', () => {
    const r = run([q(), q({ answers: [{ correct: false }, { correct: false }] }), 'oops']);
    expect(r.questions).toEqual([]);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/^Question 2:/);
    expect(r.errors[1]).toMatch(/^Question 3:/);
  });

  it('allows blank question text (finish it in the editor)', () => {
    expect(run([q({ text: '' })]).errors).toEqual([]);
  });
});
