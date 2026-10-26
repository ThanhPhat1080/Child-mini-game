import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const MEDIA_BUCKET = 'media';

/** Public URL for a path in the media bucket, or null when there is no file. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = createSupabaseBrowserClient();
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Uploads a file into the media bucket and returns its path. Admin only (RLS, T1). */
export async function uploadMedia(folder: string, file: File): Promise<string> {
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
