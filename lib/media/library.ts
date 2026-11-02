import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isBucketPath } from '@/lib/mediaPaths';
import { MEDIA_SOURCES, objectAudioPaths } from '@/lib/media/refs';
import { unsavedUploads } from '@/lib/media/uploads';

/**
 * Every bucket file of one kind that a record still uses, distinct; files uploaded but not saved yet first (newest first), then the rest sorted (A23).
 * Reads the columns listed in MEDIA_SOURCES. Throws when a query fails.
 */
export async function listLibrary(kind: 'image' | 'audio'): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const found = new Set<string>();
  for (const src of MEDIA_SOURCES) {
    if (src.kind !== kind) continue;
    const { data, error } = await supabase.from(src.table).select(src.column);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const value = row[src.column];
      const paths = src.objectAudio ? objectAudioPaths(value) : [value];
      for (const p of paths) if (typeof p === 'string' && isBucketPath(p)) found.add(p);
    }
  }
  // uploaded in a dialog, not saved yet (A24): newest first, above the rest
  const fresh = unsavedUploads(kind).reverse();
  const rest = [...found].filter((p) => !fresh.includes(p)).sort();
  return [...new Set([...fresh, ...rest])];
}
