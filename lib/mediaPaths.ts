/** A picked file that is only previewed locally; it is uploaded when the user presses Save. */
export const PENDING_PREFIX = 'pending:';

/** True for a file that lives in our `media` bucket. Bundled art, external links and unsaved picks are not ours to delete. */
export function isBucketPath(path: string | null | undefined): path is string {
  return !!path && !path.startsWith('seed/') && !path.startsWith(PENDING_PREFIX) && !/^https?:\/\//i.test(path);
}

export type SetPaths = {
  cover: string | null;
  qs: { qimg: string | null; voice: string | null; imgs: (string | null)[] }[];
};

/** Returns a copy of the set with every media field passed through `fn(path, folder)`. */
export function mapSetMedia<T extends SetPaths>(d: T, fn: (path: string | null, folder: string) => string | null): T {
  return {
    ...d,
    cover: fn(d.cover, 'covers'),
    qs: d.qs.map((q) => ({ ...q, qimg: fn(q.qimg, 'questions'), voice: fn(q.voice, 'voices'), imgs: q.imgs.map((p) => fn(p, 'answers')) })),
  };
}

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
