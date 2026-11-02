import { describe, expect, it, vi } from 'vitest';

const tree = vi.hoisted((): Record<string, { name: string; id: string | null }[]> => ({
  '': [{ name: 'library', id: null }, { name: 'cards', id: null }, { name: 'readme.txt', id: 'x' }],
  library: [{ name: 'a-000000000aaaa.png', id: '1' }, { name: 's-000000000bbbb.mp3', id: '2' }],
  cards: [{ name: 'old.svg', id: '3' }, { name: 'sub', id: null }],
  'cards/sub': [{ name: 'deep.webp', id: '4' }],
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    storage: { from: () => ({ list: async (dir: string) => ({ data: tree[dir] ?? [], error: null }) }) },
  }),
}));

import { listLibrary } from '@/lib/media/library';

describe('listLibrary', () => {
  it('walks the folders and keeps only the files of the kind, newest first', async () => {
    expect(await listLibrary('image')).toEqual(['library/a-000000000aaaa.png', 'cards/old.svg', 'cards/sub/deep.webp']);
    expect(await listLibrary('audio')).toEqual(['library/s-000000000bbbb.mp3']);
  });
});
