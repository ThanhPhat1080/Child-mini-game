import { newCard, type ECard } from '@/lib/memory/adminCards';
import { readImage } from '@/lib/quizImport';

export const CARD_IMPORT_MAX = 100;
export const WORD_MAX = 40;
const MAX_URL = 2000;

export type CardImportResult = { cards: ECard[]; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Blank means "no recorded voice" (the word is read by the browser voice). Otherwise an https:// link. */
function readAudio(v: unknown): { value: string | null } | { error: string } {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== 'string') return { error: 'audio must be text (a link) or left blank' };
  const s = v.trim();
  if (!s) return { value: null };
  if (/^http:\/\//i.test(s)) return { error: 'audio link must start with https:// (http:// links are blocked by browsers)' };
  if (!/^https:\/\//i.test(s)) return { error: 'audio must be blank or a link starting with https://' };
  if (s.length > MAX_URL) return { error: 'audio link is too long' };
  try { new URL(s); } catch { return { error: 'audio link is not a valid address' }; }
  return { value: s };
}

/**
 * Parses and validates a memory-cards-template.json file. Nothing is returned for import when there is any error.
 * Raw SVG code is kept as normalized SVG text in `image`; the page turns it into a pending file.
 */
export function parseCardImport(text: string): CardImportResult {
  let root: unknown;
  try { root = JSON.parse(text); } catch (e) {
    return { cards: [], errors: [`This is not valid JSON (${(e as Error).message}).`] };
  }
  const list = Array.isArray(root) ? root : isObj(root) ? root.cards : undefined;
  if (!Array.isArray(list)) return { cards: [], errors: ['The file needs a "cards" list.'] };
  if (list.length === 0) return { cards: [], errors: ['The "cards" list is empty.'] };
  if (list.length > CARD_IMPORT_MAX) return { cards: [], errors: [`Too many cards (${list.length}). Import up to ${CARD_IMPORT_MAX} at a time.`] };

  const errors: string[] = [];
  const cards: ECard[] = [];
  list.forEach((raw, i) => {
    const label = `Card ${i + 1}`;
    if (!isObj(raw)) { errors.push(`${label}: must be an object with a "word".`); return; }
    const c = newCard();
    if (raw.word === undefined || raw.word === null) errors.push(`${label}: word is required (the English word read aloud).`);
    else if (typeof raw.word !== 'string') errors.push(`${label}: word must be text.`);
    else {
      const w = raw.word.trim();
      if (!w) errors.push(`${label}: word is required (the English word read aloud).`);
      else if (w.length > WORD_MAX) errors.push(`${label}: word is longer than ${WORD_MAX} characters.`);
      else c.word = w;
    }
    const img = readImage(raw.image);
    if ('error' in img) errors.push(`${label}: ${img.error}`); else c.image = img.value;
    const aud = readAudio(raw.audio);
    if ('error' in aud) errors.push(`${label}: ${aud.error}`); else c.audio = aud.value;
    if (raw.active !== undefined) {
      if (typeof raw.active === 'boolean') c.active = raw.active;
      else errors.push(`${label}: active must be true or false`);
    }
    cards.push(c);
  });
  return errors.length ? { cards: [], errors } : { cards, errors };
}
