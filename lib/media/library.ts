import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isBucketPath } from '@/lib/mediaPaths';
import { MEDIA_SOURCES, objectAudioPaths } from '@/lib/media/refs';

/**
 * Every bucket file of one kind that a record still uses, distinct and sorted (A23).
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
  return [...found].sort();
}
