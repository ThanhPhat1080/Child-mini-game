/**
 * Files uploaded from a library dialog that no record uses yet. The library lists them until the page
 * saves or reverts (forgetUploads). Nothing is deleted here: a file left unsaved stays in the bucket, unused.
 */
const unsaved = new Map<string, 'image' | 'audio'>();

export const rememberUpload = (path: string, kind: 'image' | 'audio'): void => { unsaved.set(path, kind); };

export const unsavedUploads = (kind: 'image' | 'audio'): string[] => [...unsaved].filter(([, k]) => k === kind).map(([p]) => p);

/** Called after a page saves (the files are in records now) or reverts. */
export const forgetUploads = (): void => { unsaved.clear(); };
