import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.fn();
const remove = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    storage: { from: () => ({ upload, remove, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) },
  }),
}));

import { addPending, clearPending, commitPendingMedia, mediaUrl, pendingName } from '@/lib/media';
import { mapSetMedia } from '@/lib/mediaPaths';

const file = (name: string, type = 'image/svg+xml', size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const blank = () => ({ cover: null as string | null, qs: [{ qimg: null as string | null, voice: null as string | null, imgs: [null, null, null] as (string | null)[] }] });

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ error: null });
  remove.mockReset().mockResolvedValue({ error: null });
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => clearPending());

describe('picking a file', () => {
  it('only previews it: nothing is uploaded', () => {
    const t = addPending(file('apple.svg'));
    expect(t.startsWith('pending:')).toBe(true);
    expect(mediaUrl(t)).toBe('blob:preview-1');
    expect(pendingName(t)).toBe('apple.svg');
    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects an image over 2 MB right away', () => {
    expect(() => addPending(file('big.png', 'image/png', 3 * 1024 * 1024))).toThrow(/2 MB/);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('clearPending frees the preview', () => {
    const t = addPending(file('a.svg'));
    clearPending();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(mediaUrl(t)).toBeNull();
  });
});

describe('commitPendingMedia (Save)', () => {
  it('uploads each picked file once, into the right folder, and swaps in real paths', async () => {
    const d = blank();
    d.cover = addPending(file('cover.svg'));
    d.qs[0].imgs[0] = addPending(file('a1.svg'));
    d.qs[0].imgs[1] = 'answers/old.png'; // already saved: untouched
    d.qs[0].voice = addPending(file('v.mp3', 'audio/mpeg'));
    const { d: out, uploaded } = await commitPendingMedia(d);
    expect(upload).toHaveBeenCalledTimes(3);
    const folders = upload.mock.calls.map((c) => (c[0] as string).split('/')[0]).sort();
    expect(folders).toEqual(['answers', 'covers', 'voices']);
    expect(uploaded).toHaveLength(3);
    expect(out.cover).toMatch(/^covers\/\d+\.svg$/);
    expect(out.qs[0].imgs[0]).toMatch(/^answers\/\d+\.svg$/);
    expect(out.qs[0].imgs[1]).toBe('answers/old.png');
    expect(out.qs[0].voice).toMatch(/^voices\/\d+\.mp3$/);
    expect(JSON.stringify(out)).not.toContain('pending:');
  });

  it('uploads nothing when there are no picks', async () => {
    const d = blank();
    d.cover = 'covers/1.png';
    const r = await commitPendingMedia(d);
    expect(upload).not.toHaveBeenCalled();
    expect(r.uploaded).toEqual([]);
    expect(r.d).toEqual(d);
  });

  it('a picture replaced before Save is never uploaded', async () => {
    const d = blank();
    addPending(file('first.svg'));
    d.cover = addPending(file('second.svg'));
    await commitPendingMedia(d);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][1].name).toBe('second.svg');
  });

  it('rolls back earlier uploads and throws when one fails', async () => {
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'boom' } });
    const d = blank();
    d.cover = addPending(file('c.svg'));
    d.qs[0].qimg = addPending(file('q.svg'));
    await expect(commitPendingMedia(d)).rejects.toThrow('boom');
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toHaveLength(1);
  });

  it('fails clearly when a picked file was discarded', async () => {
    const d = blank();
    d.cover = addPending(file('c.svg'));
    clearPending();
    await expect(commitPendingMedia(d)).rejects.toThrow(/choose it again/);
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('mapSetMedia', () => {
  it('maps cover, question image, voice and answers with their folders', () => {
    const seen: string[] = [];
    mapSetMedia({ cover: 'c', qs: [{ qimg: 'q', voice: 'v', imgs: ['a', null] }] }, (p, f) => { seen.push(`${f}:${p}`); return p; });
    expect(seen).toEqual(['covers:c', 'questions:q', 'voices:v', 'answers:a', 'answers:null']);
  });
});
