/** True for a file that lives in our `media` bucket. Bundled sample art and external links are not ours to delete. */
export function isBucketPath(path: string | null | undefined): path is string {
  return !!path && !path.startsWith('seed/') && !/^https?:\/\//i.test(path);
}

type SetPaths = {
  cover: string | null;
  qs: { qimg: string | null; voice: string | null; imgs: (string | null)[] }[];
};

/** Every bucket file a set points to (cover, question images and voices, answer images). */
export function setMediaPaths(d: SetPaths): string[] {
  const all = [d.cover, ...d.qs.flatMap((q) => [q.qimg, q.voice, ...q.imgs])];
  return all.filter(isBucketPath);
}

/**
 * Files to delete once a save has been committed: everything the previous saved state or this
 * edit session's uploads pointed to that the committed state no longer uses.
 */
export function pathsToDelete(
  before: Iterable<string | null | undefined>,
  after: Iterable<string | null | undefined>,
  uploaded: Iterable<string | null | undefined> = [],
): string[] {
  const keep = new Set(after);
  const out = new Set<string>();
  for (const p of [...before, ...uploaded]) if (isBucketPath(p) && !keep.has(p)) out.add(p);
  return [...out];
}
