import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_IMPORT_MAX, WORD_MAX, parseCardImport } from '@/lib/memory/import';

const c = (over: Record<string, unknown> = {}) => ({ word: 'apple', image: '', audio: '', active: true, ...over });
const run = (cards: unknown) => parseCardImport(JSON.stringify({ cards }));
const SVG = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><circle cx='4' cy='4' r='3'/></svg>";

describe('parseCardImport', () => {
  it('limits', () => {
    expect(CARD_IMPORT_MAX).toBe(100);
    expect(WORD_MAX).toBe(40);
  });

  it('accepts the shipped template with no errors', () => {
    const r = parseCardImport(readFileSync('public/memory-cards-template.json', 'utf8'));
    expect(r.errors).toEqual([]);
    expect(r.cards.length).toBeGreaterThanOrEqual(3);
  });

  it('maps a valid card: new, active by default, blank image and audio are null', () => {
    const r = run([{ word: 'apple' }, c({ word: 'pear', active: false })]);
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0]).toMatchObject({ isNew: true, word: 'apple', image: null, audio: null, active: true });
    expect(r.cards[1].active).toBe(false);
    expect(r.cards[0].id).not.toBe(r.cards[1].id);
  });

  it('accepts a bare array and trims words', () => {
    const r = parseCardImport(JSON.stringify([c({ word: '  lion  ' })]));
    expect(r.errors).toEqual([]);
    expect(r.cards[0].word).toBe('lion');
  });

  it('ignores keys that start with _', () => {
    const r = parseCardImport(JSON.stringify({ _readme: ['x'], _other: 1, cards: [c()] }));
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(1);
  });

  it('keeps https image and audio links', () => {
    const r = run([c({ image: ' https://example.com/a.svg ', audio: 'https://example.com/a.mp3' })]);
    expect(r.errors).toEqual([]);
    expect(r.cards[0].image).toBe('https://example.com/a.svg');
    expect(r.cards[0].audio).toBe('https://example.com/a.mp3');
  });

  it('accepts raw SVG code (normalized) and rejects unsafe SVG with the card number', () => {
    const ok = run([c({ image: SVG })]);
    expect(ok.errors).toEqual([]);
    expect(ok.cards[0].image?.startsWith('<svg')).toBe(true);
    const bad = run([c(), c({ image: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' })]);
    expect(bad.errors).toHaveLength(1);
    expect(bad.errors[0]).toMatch(/^Card 2: .*scripts/);
    expect(bad.cards).toEqual([]);
  });

  it('rejects http:// images and audio, and other text', () => {
    expect(run([c({ image: 'http://x.com/a.png' })]).errors[0]).toMatch(/^Card 1: image link must start with https:\/\//);
    expect(run([c({ audio: 'http://x.com/a.mp3' })]).errors[0]).toMatch(/^Card 1: audio link must start with https:\/\//);
    expect(run([c({ audio: 'seed/a.mp3' })]).errors[0]).toMatch(/^Card 1: audio must be blank or a link starting with https:\/\//);
    expect(run([c({ audio: 5 })]).errors[0]).toMatch(/^Card 1: audio/);
    expect(run([c({ image: 'seed/apple.svg' })]).errors[0]).toMatch(/^Card 1: image/);
    expect(run([c({ audio: 'https://x.com/' + 'a'.repeat(2000) })]).errors[0]).toMatch(/^Card 1: audio link is too long/);
  });

  it('rejects a non-boolean active', () => {
    expect(run([c({ active: 'yes' })]).errors).toEqual(['Card 1: active must be true or false']);
  });

  it('word errors: missing, empty, spaces only, number, too long', () => {
    expect(run([{ image: '' }]).errors).toEqual(['Card 1: word is required (the English word read aloud).']);
    expect(run([c({ word: '' })]).errors[0]).toMatch(/^Card 1: word is required/);
    expect(run([c({ word: '   ' })]).errors[0]).toMatch(/^Card 1: word is required/);
    expect(run([c({ word: 5 })]).errors).toEqual(['Card 1: word must be text.']);
    expect(run([c({ word: 'a'.repeat(41) })]).errors).toEqual(['Card 1: word is longer than 40 characters.']);
    expect(run([c({ word: 'a'.repeat(40) })]).errors).toEqual([]);
  });

  it('lists every problem with its card number and returns no cards', () => {
    const r = run([c({ word: '' }), c(), 'oops', c({ active: 1, audio: 'nope' })]);
    expect(r.cards).toEqual([]);
    expect(r.errors.map((e) => e.slice(0, 7))).toEqual(['Card 1:', 'Card 3:', 'Card 4:', 'Card 4:']);
  });

  it('file-level errors', () => {
    expect(parseCardImport('{nope').errors[0]).toMatch(/^This is not valid JSON/);
    expect(parseCardImport('{}').errors).toEqual(['The file needs a "cards" list.']);
    expect(parseCardImport('{"cards":[]}').errors).toEqual(['The "cards" list is empty.']);
    const many = run(Array.from({ length: 101 }, () => c()));
    expect(many.errors).toEqual(['Too many cards (101). Import up to 100 at a time.']);
    expect(many.cards).toEqual([]);
    expect(run(Array.from({ length: 100 }, () => c())).errors).toEqual([]);
  });
});
