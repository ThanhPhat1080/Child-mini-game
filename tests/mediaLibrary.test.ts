import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for `.from(table).select(column)`, awaited directly (the way listLibrary reads it).
const db = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>,
  offline: false,
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    from: (table: string) => ({
      select: (col: string) => ({
        then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) => {
          const result = db.offline
            ? { data: null, error: { message: 'offline' } }
            : { data: (db.rows[table] ?? []).map((r) => ({ [col]: r[col] })), error: null };
          return Promise.resolve(result).then(onOk, onErr);
        },
      }),
    }),
  }),
}));

import { listLibrary } from '@/lib/media/library';

function seed() {
  db.rows = {
    settings: [{ greeting_path: 'audio/g.mp3', music_path: 'audio/m.mp3', avatar_path: 'img/avatar.png', hooray_path: 'sfx/h.mp3', ohoh_path: null, complete_path: null }],
    quiz_sets: [{ cover_path: 'covers/q.png' }],
    questions: [
      { prompt_image_path: 'questions/p.png', prompt_audio_path: 'voices/v.mp3' },
      { prompt_image_path: 'questions/p.png', prompt_audio_path: null },
    ],
    answers: [{ image_path: 'answers/a.png' }],
    memory_cards: [
      { image_path: 'cards/c1.png', audio_path: 'cards/c1.mp3' },
      { image_path: 'seed/apple.svg', audio_path: null },
      { image_path: 'https://cdn.example/x.png', audio_path: null },
      { image_path: 'pending:tok-1', audio_path: null },
      { image_path: 'img/avatar.png', audio_path: null },
    ],
    spot_levels: [{ image_a_path: 'spot/a.png', image_b_path: 'spot/b.png' }],
    find_levels: [
      { image_path: 'find/f.png', objects: [{ audio_path: 'find/cup.mp3' }, { audio_path: null }, { audio_path: 'find/cup.mp3' }] },
      { image_path: 'find/f.png', objects: null },
    ],
  };
}

beforeEach(() => {
  db.offline = false;
  seed();
});

describe('listLibrary', () => {
  it('image: merges card, spot, find, quiz, question, answer and avatar pictures, drops seed/http/pending and duplicates, sorted', async () => {
    expect(await listLibrary('image')).toEqual([
      'answers/a.png',
      'cards/c1.png',
      'covers/q.png',
      'find/f.png',
      'img/avatar.png',
      'questions/p.png',
      'spot/a.png',
      'spot/b.png',
    ]);
  });

  it('audio: merges card recordings, find object sounds, question audio and settings sounds, drops duplicates, sorted', async () => {
    expect(await listLibrary('audio')).toEqual([
      'audio/g.mp3',
      'audio/m.mp3',
      'cards/c1.mp3',
      'find/cup.mp3',
      'sfx/h.mp3',
      'voices/v.mp3',
    ]);
  });

  it('does not list a find object sound as a picture, nor a picture as a sound', async () => {
    expect(await listLibrary('image')).not.toContain('find/cup.mp3');
    expect(await listLibrary('audio')).not.toContain('find/f.png');
  });

  it('reads a find_levels row whose objects is not a list without crashing', async () => {
    db.rows = { find_levels: [{ image_path: null, objects: 'oops' }] };
    expect(await listLibrary('audio')).toEqual([]);
    expect(await listLibrary('image')).toEqual([]);
  });

  it('gives the same order on every call', async () => {
    expect(await listLibrary('audio')).toEqual(await listLibrary('audio'));
  });

  it('rejects when a query fails, so the dialog can show an error', async () => {
    db.offline = true;
    await expect(listLibrary('image')).rejects.toThrow('offline');
    await expect(listLibrary('audio')).rejects.toThrow('offline');
  });
});
