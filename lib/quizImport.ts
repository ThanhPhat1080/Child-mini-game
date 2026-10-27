import { newQuestion, type EQuestion } from '@/lib/sets';

export const IMPORT_MAX_QUESTIONS = 50;
export const IMPORT_MAX_BYTES = 1024 * 1024;
const MAX_TEXT = 200;
const MAX_URL = 2000;

export type ImportResult = { questions: EQuestion[]; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Blank means "upload later". Anything else must be an https:// link. Returns the cleaned value or an error. */
function readImage(v: unknown): { value: string | null } | { error: string } {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== 'string') return { error: 'image must be text (a link) or left blank' };
  const s = v.trim();
  if (!s) return { value: null };
  if (/^http:\/\//i.test(s)) return { error: 'image link must start with https:// (http:// links are blocked by browsers)' };
  if (!/^https:\/\//i.test(s)) return { error: 'image must be blank or a link starting with https://' };
  if (s.length > MAX_URL) return { error: 'image link is too long' };
  try { new URL(s); } catch { return { error: 'image link is not a valid address' }; }
  return { value: s };
}

function readText(v: unknown, label: string, errors: string[]): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') { errors.push(`${label}: text must be a string`); return ''; }
  const s = v.trim();
  if (s.length > MAX_TEXT) errors.push(`${label}: text is longer than ${MAX_TEXT} characters`);
  return s;
}

/** Parses and validates a quiz-template.json file. Nothing is returned for import when there is any error. */
export function parseQuizImport(text: string): ImportResult {
  let root: unknown;
  try { root = JSON.parse(text); } catch (e) {
    return { questions: [], errors: [`This is not valid JSON (${(e as Error).message}).`] };
  }
  const list = Array.isArray(root) ? root : isObj(root) ? root.questions : undefined;
  if (!Array.isArray(list)) return { questions: [], errors: ['The file needs a "questions" list.'] };
  if (list.length === 0) return { questions: [], errors: ['The "questions" list is empty.'] };
  if (list.length > IMPORT_MAX_QUESTIONS) return { questions: [], errors: [`Too many questions (${list.length}). Import up to ${IMPORT_MAX_QUESTIONS} at a time.`] };

  const errors: string[] = [];
  const questions: EQuestion[] = [];
  list.forEach((raw, qi) => {
    const ql = `Question ${qi + 1}`;
    if (!isObj(raw)) { errors.push(`${ql}: must be an object with "text" and "answers".`); return; }
    const q = newQuestion();
    q.text = readText(raw.text, ql, errors);
    const qimg = readImage(raw.image);
    if ('error' in qimg) errors.push(`${ql}: ${qimg.error}`); else q.qimg = qimg.value;
    if (raw.readAnswersAloud !== undefined) {
      if (typeof raw.readAnswersAloud === 'boolean') q.readAnswers = raw.readAnswersAloud;
      else errors.push(`${ql}: readAnswersAloud must be true or false`);
    }

    if (!Array.isArray(raw.answers) || raw.answers.length < 2 || raw.answers.length > 3) {
      errors.push(`${ql}: needs 2 or 3 answers.`);
      return;
    }
    q.count = raw.answers.length === 2 ? 2 : 3;
    let correct = 0;
    raw.answers.forEach((a: unknown, ai) => {
      const al = `${ql}, answer ${ai + 1}`;
      if (!isObj(a)) { errors.push(`${al}: must be an object.`); return; }
      q.texts[ai] = readText(a.text, al, errors);
      const img = readImage(a.image);
      if ('error' in img) errors.push(`${al}: ${img.error}`); else q.imgs[ai] = img.value;
      if (a.correct !== undefined && typeof a.correct !== 'boolean') errors.push(`${al}: correct must be true or false`);
      else if (a.correct === true) { correct += 1; q.correct = ai; }
    });
    if (correct !== 1) errors.push(`${ql}: mark exactly one answer with "correct": true (found ${correct}).`);
    questions.push(q);
  });
  return errors.length ? { questions: [], errors } : { questions, errors };
}
