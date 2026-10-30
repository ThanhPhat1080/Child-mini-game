import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { commitPendingMap, isPending, removeMedia } from '@/lib/media';
import { isBucketPath, pathsToDelete } from '@/lib/mediaPaths';

export type ECard = { id: string; isNew: boolean; word: string; image: string | null; audio: string | null; active: boolean };

type Row = { id: string; word: string; image_path: string | null; audio_path: string | null; active: boolean };

export const newCard = (): ECard => ({ id: crypto.randomUUID(), isNew: true, word: '', image: null, audio: null, active: true });

export function isCardComplete(c: ECard): boolean {
  const n = c.word.trim().length;
  return n >= 1 && n <= 40 && !!c.image;
}

/** Lower-cased trimmed words that appear on more than one card (blank words ignored). */
export function duplicateWords(cards: ECard[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const c of cards) {
    const w = c.word.trim().toLowerCase();
    if (!w) continue;
    if (seen.has(w)) dup.add(w);
    seen.add(w);
  }
  return dup;
}

/** Bucket files a card points to (bundled art, links and unsaved picks are not ours to delete). */
export const cardMediaPaths = (c: ECard): string[] => [c.image, c.audio].filter(isBucketPath);

/** Every card, active or not (admin view), oldest first. */
export async function loadCards(): Promise<ECard[]> {
  const { data, error } = await createSupabaseBrowserClient()
    .from('memory_cards')
    .select('id, word, image_path, audio_path, active')
    .order('created_at');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: r.id, isNew: false, word: r.word, image: r.image_path, audio: r.audio_path, active: r.active }));
}

/**
 * Saves the pool: uploads picked files, writes the table, then frees files nothing uses any more.
 * A database failure leaves old files alone and removes this attempt's uploads.
 */
export async function saveCards(saved: ECard[], draft: ECard[]): Promise<{ error: string | null; warning: string | null }> {
  const wanted = new Map<string, string>();
  for (const c of draft) {
    if (isPending(c.image)) wanted.set(c.image!, 'cards');
    if (isPending(c.audio)) wanted.set(c.audio!, 'card-voices');
  }
  let done: Map<string, string>;
  try {
    done = await commitPendingMap(wanted);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), warning: null };
  }
  const uploaded = [...done.values()];
  const swap = (p: string | null) => (p ? done.get(p) ?? p : p);
  const final = draft.map((c) => ({ ...c, image: swap(c.image), audio: swap(c.audio) }));

  const fail = async (message: string) => {
    await removeMedia(uploaded); // nothing references this attempt's uploads
    return { error: message, warning: null };
  };

  const sb = createSupabaseBrowserClient();
  const keep = new Set(final.map((c) => c.id));
  const gone = saved.map((c) => c.id).filter((id) => !keep.has(id));
  if (gone.length) {
    const { error } = await sb.from('memory_cards').delete().in('id', gone);
    if (error) return fail(error.message);
  }
  if (final.length) {
    const { error } = await sb.from('memory_cards').upsert(
      final.map((c) => ({ id: c.id, word: c.word.trim(), image_path: c.image, audio_path: c.audio, active: c.active })),
      { onConflict: 'id' },
    );
    if (error) return fail(error.message);
  }

  const stale = pathsToDelete(saved.flatMap(cardMediaPaths), final.flatMap(cardMediaPaths));
  const failed = await removeMedia(stale);
  return { error: null, warning: failed ? 'The cards were saved, but some old files could not be removed from storage.' : null };
}
