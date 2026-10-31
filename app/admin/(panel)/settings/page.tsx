'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { addPending, clearPending, mediaUrl, removeMedia, uploadMedia, uploadPending } from '@/lib/media';
import { applause, ohOh, speakKid, yay, type SoundHandle } from '@/lib/sfx';
import styles from '../../admin.module.css';
import { LibraryButton } from '@/components/admin/LibraryButton';

type Row = { child_name: string; greeting_path: string | null; music_path: string | null; music_volume: number; avatar_path: string | null; hooray_path: string | null; ohoh_path: string | null; complete_path: string | null };

const baseName = (p: string | null) => (p ? p.split('/').pop() ?? p : null);

export default function SettingsPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [childName, setChildName] = useState('');
  const [volume, setVolume] = useState(30);
  /** Avatar picked but not saved yet: shown as a preview, uploaded on "Save changes". */
  const [avatarPick, setAvatarPick] = useState<string | null>(null);
  /** A picture already in the library, chosen instead of uploading (A24). Saved with Save changes. */
  const [avatarLibrary, setAvatarLibrary] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const greetingInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const soundInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const preview = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const say = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('settings')
      .select('child_name, greeting_path, music_path, music_volume, avatar_path, hooray_path, ohoh_path, complete_path')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return say(error?.message ?? 'Could not load settings', true);
        const r = data as Row;
        setRow(r);
        setChildName(r.child_name);
        setVolume(r.music_volume);
      });
  }, []);

  async function save() {
    const patch: Record<string, unknown> = { child_name: childName.trim(), music_volume: volume };
    let newAvatar: string | null = null;
    let uploaded = false; // only a fresh upload is removed on failure; a library file is shared and stays
    if (avatarPick) {
      try { newAvatar = await uploadPending(avatarPick, 'avatar'); } catch (e) { return say(e instanceof Error ? e.message : 'Upload failed', true); }
      uploaded = true;
    } else if (avatarLibrary) {
      newAvatar = avatarLibrary;
    }
    if (newAvatar) patch.avatar_path = newAvatar;
    const { error } = await createSupabaseBrowserClient().from('settings').update(patch).eq('id', 1);
    if (error) {
      if (uploaded && newAvatar) void removeMedia([newAvatar]); // the save failed, so do not keep the upload
      return say(error.message, true);
    }
    const old = row?.avatar_path;
    setRow((r) => (r ? { ...r, child_name: childName.trim(), music_volume: volume, ...(newAvatar ? { avatar_path: newAvatar } : {}) } : r));
    setAvatarPick(null);
    setAvatarLibrary(null);
    clearPending();
    const failed = newAvatar && old && old !== newAvatar ? await removeMedia([old]) : null;
    say(failed ? 'Saved, but the old avatar could not be removed from storage.' : 'Saved.', !!failed);
  }

  /** Drops unsaved name and volume edits and goes back to the last saved values. */
  function revert() {
    if (!row) return;
    setChildName(row.child_name);
    setVolume(row.music_volume);
    setAvatarPick(null);
    setAvatarLibrary(null);
    clearPending();
    say('Changes reverted.');
  }

  const dirty = !!row && (childName.trim() !== row.child_name || volume !== row.music_volume || !!avatarPick || !!avatarLibrary);

  type AudioKind = 'greeting' | 'music' | 'hooray' | 'ohoh' | 'complete';
  const COLUMN: Record<AudioKind, keyof Row> = { greeting: 'greeting_path', music: 'music_path', hooray: 'hooray_path', ohoh: 'ohoh_path', complete: 'complete_path' };

  async function removeSound(kind: AudioKind) {
    const column = COLUMN[kind];
    if (playing && playing === row?.[column]) { preview.current?.pause(); preview.current = null; setPlaying(null); }
    const old = row?.[column] as string | null | undefined;
    const { error } = await createSupabaseBrowserClient().from('settings').update({ [column]: null }).eq('id', 1);
    if (error) return say(error.message, true);
    setRow((r) => (r ? { ...r, [column]: null } : r));
    const failed = await removeMedia([old]);
    say(failed ? 'Back to the built-in sound, but the old file could not be removed from storage.' : 'Back to the built-in sound.', !!failed);
  }

  /** Points a sound setting at `path` (a new upload, or a library file that is already in the bucket) and removes the old file if no record uses it. */
  async function setSound(kind: AudioKind, path: string, fresh: boolean) {
    const column = COLUMN[kind];
    const old = row?.[column] as string | null | undefined;
    const { error } = await createSupabaseBrowserClient().from('settings').update({ [column]: path }).eq('id', 1);
    if (error) { if (fresh) void removeMedia([path]); throw new Error(error.message); }
    setRow((r) => (r ? { ...r, [column]: path } : r));
    const failed = old && old !== path ? await removeMedia([old]) : null;
    const done = fresh ? 'Uploaded.' : 'Sound chosen from the library.';
    say(failed ? `${done} The old file could not be removed from storage.` : done, !!failed);
  }

  async function upload(kind: AudioKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await setSound(kind, await uploadMedia(kind, file), true);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Upload failed', true);
    }
  }

  /** A sound from the library: no upload, the setting just points at the existing file (A24). */
  async function chooseSound(kind: AudioKind, path: string) {
    try {
      await setSound(kind, path, false);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not use this sound', true);
    }
  }

  /** Preview of the built-in sound when no custom track is set. Play / pause like the other rows. */
  const builtIn = useRef<SoundHandle | null>(null);
  const builtInTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stopBuiltIn() {
    builtIn.current?.stop();
    builtIn.current = null;
    if (builtInTimer.current) clearTimeout(builtInTimer.current);
  }
  function previewBuiltIn(kind: 'hooray' | 'ohoh' | 'complete') {
    const key = `builtin:${kind}`;
    const wasPlaying = playing === key;
    preview.current?.pause();
    preview.current = null;
    stopBuiltIn();
    if (wasPlaying) { setPlaying(null); return; }
    let h: SoundHandle | void;
    if (kind === 'hooray') h = yay();
    else if (kind === 'ohoh') h = ohOh();
    else {
      h = applause(3);
      speakKid(`You did it${row?.child_name ? `, ${row.child_name}` : ''}!`, { pitch: 1.9, rate: 0.9 });
    }
    if (!h) return;
    builtIn.current = h;
    setPlaying(key);
    builtInTimer.current = setTimeout(() => setPlaying((p) => (p === key ? null : p)), h.ms);
  }

  /** Play / pause a preview. Music previews follow the volume slider live. */
  function toggle(path: string | null) {
    const url = mediaUrl(path);
    if (!url || !path) return;
    if (playing === path && preview.current) {
      preview.current.pause();
      preview.current = null;
      setPlaying(null);
      return;
    }
    preview.current?.pause();
    stopBuiltIn();
    const audio = new Audio(url);
    audio.volume = path === row?.music_path ? volume / 100 : 1;
    audio.onended = () => setPlaying((p) => (p === path ? null : p));
    audio.play().catch(() => setPlaying(null));
    preview.current = audio;
    setPlaying(path);
  }

  useEffect(() => {
    if (preview.current && playing && playing === row?.music_path) preview.current.volume = volume / 100;
  }, [volume, playing, row?.music_path]);

  useEffect(() => () => { preview.current?.pause(); builtIn.current?.stop(); clearPending(); }, []);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return say('Use an SVG, PNG, JPG or WebP image.', true);
    if (file.size > 2 * 1024 * 1024) return say('Image must be 2 MB or smaller.', true);
    try {
      clearPending(); // a newer pick replaces the older preview
      setAvatarLibrary(null);
      setAvatarPick(addPending(file));
      say('Avatar chosen. Press Save changes to upload it.');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not use this file', true);
    }
  }

  const icon = (key: string | null) =>
    key && playing === key ? (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
    ) : (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M8 5.5v13l10.5-6.5z" /></svg>
    );

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>Settings</h1>
          <p className={styles.sub}>What the child sees and hears on the Welcome screen.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className={styles.ghost} style={{ height: 46 }} onClick={revert} disabled={!dirty}>Revert</button>
          <button type="button" className={styles.primary} style={{ height: 46 }} onClick={save}>Save changes</button>
        </div>
      </div>

      <section className={`${styles.section} ${styles.profile}`}>
        <div className={styles.avatar}>
          {mediaUrl(avatarPick ?? avatarLibrary ?? row?.avatar_path) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(avatarPick ?? avatarLibrary ?? row?.avatar_path) ?? ''} alt="Avatar" className={styles.avatarImg} />
          ) : (
            <svg aria-hidden="true" width="54" height="38" viewBox="0 0 60 42" fill="#F6E2A6" stroke="#B08A48" strokeWidth="2" strokeLinejoin="round"><path d="M4 38 L8 10 L20 24 L30 4 L40 24 L52 10 L56 38 Z" /></svg>
          )}
        </div>
        <div className={styles.profileBody}>
          <div className={styles.fieldGroup}>
            <label htmlFor="cn">Child&apos;s name</label>
            <input id="cn" className={`${styles.input} ${styles.nameInput}`} type="text" value={childName} onChange={(e) => setChildName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input ref={avatarInput} className={styles.hidden} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onChange={uploadAvatar} />
            <button type="button" className={styles.ghost} onClick={() => avatarInput.current?.click()}>{row?.avatar_path || avatarPick ? 'Replace avatar' : 'Upload avatar'}</button>
            <LibraryButton kind="image" label="avatar" onChoose={(path) => { clearPending(); setAvatarPick(null); setAvatarLibrary(path); say('Avatar chosen. Press Save changes to apply it.'); }} />
            <span className={styles.note}>SVG, PNG, JPG or WebP, square, up to 2 MB. Uploaded when you press Save changes.</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div>
          <h2>Greeting voice</h2>
          <p>Plays once after the child taps to enter.</p>
        </div>
        <div className={styles.row}>
          {row?.greeting_path && (
            <button type="button" className={styles.playBtn} aria-label={playing === row.greeting_path ? 'Pause greeting' : 'Play greeting'} onClick={() => toggle(row.greeting_path)}>{icon(row.greeting_path)}</button>
          )}
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>{baseName(row?.greeting_path ?? null) ?? 'No greeting yet'}</div>
            <div className={styles.rowMeta}>Audio file, MP3 or similar</div>
          </div>
          <input ref={greetingInput} className={styles.hidden} type="file" accept="audio/*" onChange={(e) => upload('greeting', e)} />
          <button type="button" className={styles.ghost} onClick={() => greetingInput.current?.click()}>{row?.greeting_path ? 'Replace' : 'Upload'}</button>
          <LibraryButton kind="audio" label="greeting" onChoose={(path) => void chooseSound('greeting', path)} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.head} style={{ alignItems: 'flex-end' }}>
          <div>
            <h2>Background music</h2>
            <p>Instrumental, royalty-free. The selected track loops quietly.</p>
          </div>
          <input ref={musicInput} className={styles.hidden} type="file" accept="audio/*" onChange={(e) => upload('music', e)} />
          <button type="button" className={styles.ghost} onClick={() => musicInput.current?.click()}>{row?.music_path ? 'Replace track' : '+ Upload track'}</button>
          <LibraryButton kind="audio" label="background music" onChoose={(path) => void chooseSound('music', path)} />
        </div>
        <div className={`${styles.row} ${row?.music_path ? styles.rowSel : ''}`}>
          {row?.music_path && (
            <button type="button" className={styles.playBtn} aria-label={playing === row.music_path ? 'Pause track' : 'Play track'} onClick={() => toggle(row.music_path)}>{icon(row.music_path)}</button>
          )}
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>{baseName(row?.music_path ?? null) ?? 'No track yet'}</div>
            <div className={styles.rowMeta}>Loops on the child screens</div>
          </div>
        </div>
        <div className={styles.volume}>
          <label htmlFor="vol" className={styles.label}>Music volume</label>
          <input id="vol" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          <span className={styles.note}>{volume}% · kept low on purpose</span>
        </div>
      </section>

      <section className={styles.section}>
        <div>
          <h2>Feedback sounds</h2>
          <p>Optional. Upload your own track for each moment; without one, the built-in sound plays.</p>
        </div>
        {([
          { kind: 'hooray', title: 'Hooray', hint: 'Plays when the child picks the correct answer.', path: row?.hooray_path ?? null },
          { kind: 'ohoh', title: 'Oh-oh', hint: 'Plays when the child picks a wrong answer.', path: row?.ohoh_path ?? null },
          { kind: 'complete', title: 'You did it', hint: 'Plays when a quiz set is finished (replaces the applause and spoken praise).', path: row?.complete_path ?? null },
        ] as const).map((it) => (
          <div key={it.kind} className={styles.row}>
            <button type="button" className={styles.playBtn} aria-label={`${playing === (it.path ?? `builtin:${it.kind}`) ? 'Pause' : 'Play'} ${it.title} sound`} onClick={() => (it.path ? toggle(it.path) : previewBuiltIn(it.kind))}>{icon(it.path ?? `builtin:${it.kind}`)}</button>
            <div className={styles.rowText}>
              <div className={styles.rowTitle}>{it.title}: <span style={{ fontWeight: 600 }}>{baseName(it.path) ?? 'built-in sound'}</span></div>
              <div className={styles.rowMeta}>{it.hint}</div>
            </div>
            <input ref={(el) => { soundInputs.current[it.kind] = el; }} className={styles.hidden} type="file" accept="audio/*" onChange={(e) => upload(it.kind, e)} />
            <button type="button" className={styles.ghost} onClick={() => soundInputs.current[it.kind]?.click()}>{it.path ? 'Replace' : 'Upload'}</button>
            <LibraryButton kind="audio" label={`${it.title} sound`} onChoose={(path) => void chooseSound(it.kind, path)} />
            {it.path && <button type="button" className={styles.ghost} onClick={() => removeSound(it.kind)}>Use built-in</button>}
          </div>
        ))}
      </section>

      {toast && <div role="status" className={`${styles.toast} ${toast.error ? styles.toastErr : ''}`}>{toast.text}</div>}
    </>
  );
}
