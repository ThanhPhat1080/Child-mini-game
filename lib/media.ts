import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isBucketPath } from '@/lib/mediaPaths';

export const MEDIA_BUCKET = 'media';
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Public URL for a path in the media bucket, or null when there is no file. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('seed/')) return `/${path}`; // bundled sample art
  if (/^https?:\/\//i.test(path)) return path; // image link from the internet (Quick import)
  const supabase = createSupabaseBrowserClient();
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Uploads a file into the media bucket and returns its path. Admin only (RLS, T1). */
export async function uploadMedia(folder: string, file: File): Promise<string> {
  if (file.type.startsWith('image/') && file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 2 MB or smaller.');
  }
  const supabase = createSupabaseBrowserClient();
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : 'bin';
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Deletes files from the media bucket to free storage. Bundled art and external links are skipped.
 * Returns an error message, or null on success. Admin only (RLS, T1).
 */
export async function removeMedia(paths: (string | null | undefined)[]): Promise<string | null> {
  const mine = [...new Set(paths.filter(isBucketPath))];
  if (!mine.length) return null;
  const { error } = await createSupabaseBrowserClient().storage.from(MEDIA_BUCKET).remove(mine);
  return error ? error.message : null;
}
