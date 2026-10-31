'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { addPending, clearPending, isPending, mediaUrl, removeMedia, uploadPending } from '@/lib/media';
import { applause, ohOh, speakKid, yay, type SoundHandle } from '@/lib/sfx';
import styles from '../../admin.module.css';
import { LibraryButton } from '@/components/admin/LibraryButton';
import { forgetUploads } from '@/lib/media/uploads';

type Row = { child_name: string; greeting_path: string | null; music_path: string | null; music_volume: number; avatar_path: string | null; hooray_path: string | null; ohoh_path: string | null; complete_path: string | null };
type AudioKind = 'greeting' | 'music' | 'hooray' | 'ohoh' | 'complete';

const COLUMN: Record<AudioKind, keyof Row> = { greeting: 'greeting_path', music: 'music_path', hooray: 'hooray_path', ohoh: 'ohoh_path', complete: 'complete_path' };
/** A sound choice not saved yet: a pending token (a new file), a bucket path (from the library), or null (back to the built-in sound). */
type SoundDraft = Partial<Record<AudioKind, string | null>>;

const baseName = (p: string | null) => (p ? p.split('/').pop() ?? p : null);
/** Play-state key of one sound setting. Keyed by setting, not by file: two settings may share one file. */
const fileKey = (k: AudioKind) => `file:${k}`;

const ACCEPT_AVATAR = 'image/svg+xml,image/png,image/jpeg,image/webp';

/** Every change here is a preview until "Save changes"; "Revert" drops it (A25, A26). */
export default function SettingsPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [childName, setChildName] = useState('');
  const [volume, setVolume] = useState(30);
  /** Avatar picked but not saved yet: shown as a preview, uploaded on "Save changes". */
  const [avatarPick, setAvatarPick] = useState<string | null>(null);
  /** A picture already in the library, chosen instead of uploading (A24). Saved with Save changes. */
  const [avatarLibrary, setAvatarLibrary] = useState<string | null>(null);
  const [soundDraft, setSoundDraft] = useState<SoundDraft>({});
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const soundInputs = useRef<Partial<Record<AudioKind, HTMLInputElement | null>>>({});
  const preview = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const say = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  };

  /** What the row shows and plays: the draft if there is one, else the saved file. */
  const shown = (k: AudioKind): string | null => (k in soundDraft ? soundDraft[k] ?? null : (row?.[COLUMN[k]] as string | null | undefined) ?? null);
  /** Pending files that must survive a change to the other picture (they are only dropped by Save or Revert). */
  const keepPending = () => Object.values(soundDraft).filter((v): v is string => isPending(v));

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

  function stopPreview() {
    preview.current?.pause();
    preview.current = null;
    stopBuiltIn();
    setPlaying(null);
  }

  async function save() {
    const patch: Partial<Row> = { child_name: childName.trim(), music_volume: volume };
    const fresh: string[] = []; // files uploaded by this save: removed again if the save fails
    const replaced: string[] = []; // files no setting uses any more, after a successful save
    let newAvatar: string | null = null;
    try {
      if (avatarPick) {
        newAvatar = await uploadPending(avatarPick, 'avatar');
        fresh.push(newAvatar);
      } else if (avatarLibrary) {
        newAvatar = avatarLibrary;
      }
      if (newAvatar) {
        patch.avatar_path = newAvatar;
        if (row?.avatar_path && row.avatar_path !== newAvatar) replaced.push(row.avatar_path);
      }
      for (const k of Object.keys(soundDraft) as AudioKind[]) {
        const v = soundDraft[k] ?? null;
        let path = v;
        if (v && isPending(v)) {
          path = await uploadPending(v, k);
          fresh.push(path);
        }
        (patch as Record<string, unknown>)[COLUMN[k]] = path;
        const old = row?.[COLUMN[k]] as string | null | undefined;
        if (old && old !== path) replaced.push(old);
      }
    } catch (e) {
      void removeMedia(fresh);
      return say(e instanceof Error ? e.message : 'Upload failed', true);
    }
    const { error } = await createSupabaseBrowserClient().from('settings').update(patch).eq('id', 1);
    if (error) {
      void removeMedia(fresh); // the save failed, so do not keep the uploads
      return say(error.message, true);
    }
    setRow((r) => (r ? { ...r, ...patch } : r));
    setAvatarPick(null);
    setAvatarLibrary(null);
    setSoundDraft({});
    clearPending();
    forgetUploads();
    stopPreview();
    const failed = await removeMedia(replaced);
    say(failed ? 'Saved, but an old file could not be removed from storage.' : 'Saved.', !!failed);
  }

  /** Drops unsaved edits and goes back to the last saved values. */
  function revert() {
    if (!row) return;
    setChildName(row.child_name);
    setVolume(row.music_volume);
    setAvatarPick(null);
    setAvatarLibrary(null);
    setSoundDraft({});
    clearPending();
    forgetUploads();
    stopPreview();
    say('Changes reverted.');
  }

  const soundChanged = (Object.keys(soundDraft) as AudioKind[]).some((k) => (soundDraft[k] ?? null) !== ((row?.[COLUMN[k]] as string | null | undefined) ?? null));
  const dirty = !!row && (childName.trim() !== row.child_name || volume !== row.music_volume || !!avatarPick || !!avatarLibrary || soundChanged);

  /** A sound choice from the library or a picked file: a preview until Save. */
  function setDraftSound(kind: AudioKind, path: string | null) {
    if (playing === fileKey(kind)) stopPreview();
    setSoundDraft((d) => ({ ...d, [kind]: path }));
  }

  function pickSoundFile(kind: AudioKind, file: File) {
    try {
      setDraftSound(kind, addPending(file));
      say('Sound chosen. Press Save changes to upload it.');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not use this file', true);
    }
  }

  function chooseSound(kind: AudioKind, path: string) {
    setDraftSound(kind, path);
    say('Sound chosen. Press Save changes to apply it.');
  }

  function removeSound(kind: AudioKind) {
    setDraftSound(kind, null);
    say('Built-in sound chosen. Press Save changes to apply it.');
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

  /** Play / pause the shown file of one setting. Music previews follow the volume slider live. */
  function toggle(kind: AudioKind) {
    const key = fileKey(kind);
    const path = shown(kind);
    const url = mediaUrl(path);
    if (!url || !path) return;
    if (playing === key && preview.current) {
      preview.current.pause();
      preview.current = null;
      setPlaying(null);
      return;
    }
    preview.current?.pause();
    stopBuiltIn();
    const audio = new Audio(url);
    audio.volume = kind === 'music' ? volume / 100 : 1;
    audio.onended = () => setPlaying((p) => (p === key ? null : p));
    preview.current = audio;
    setPlaying(key);
    audio.play().catch(() => { preview.current = null; setPlaying(null); });
  }

  useEffect(() => {
    if (preview.current && playing === fileKey('music')) preview.current.volume = volume / 100;
  }, [volume, playing]);

  useEffect(() => () => { preview.current?.pause(); builtIn.current?.stop(); clearPending(); }, []);

  /** A new avatar choice: validated, kept as a preview until Save. */
  function pickAvatar(file: File) {
    if (!['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return say('Use an SVG, PNG, JPG or WebP image.', true);
    if (file.size > 2 * 1024 * 1024) return say('Image must be 2 MB or smaller.', true);
    try {
      clearPending(keepPending()); // a newer pick replaces the older avatar preview
      setAvatarLibrary(null);
      setAvatarPick(addPending(file));
      say('Avatar chosen. Press Save changes to upload it.');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not use this file', true);
    }
  }

  function chooseAvatar(path: string) {
    clearPending(keepPending());
    setAvatarPick(null);
    setAvatarLibrary(path);
    say('Avatar chosen. Press Save changes to apply it.');
  }

  const icon = (on: boolean) =>
    on ? (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
    ) : (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M8 5.5v13l10.5-6.5z" /></svg>
    );

  /** One sound setting's upload controls: Replace / Upload, Choose from library, and Use built-in. */
  function soundActions(kind: AudioKind, label: string, saved: boolean, builtInOption: boolean) {
    return (
      <>
        <input ref={(el) => { soundInputs.current[kind] = el; }} className={styles.hidden} type="file" accept="audio/*" aria-label={`Sound file for ${label}`}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickSoundFile(kind, f); }} />
        <button type="button" className={styles.ghost} onClick={() => soundInputs.current[kind]?.click()}>{saved || shown(kind) ? 'Replace' : 'Upload'}</button>
        <LibraryButton kind="audio" label={label} onChoose={(path) => chooseSound(kind, path)} />
        {builtInOption && shown(kind) && <button type="button" className={styles.ghost} onClick={() => removeSound(kind)}>Use built-in</button>}
      </>
    );
  }

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
            <input ref={avatarInput} className={styles.hidden} type="file" accept={ACCEPT_AVATAR} aria-label="Avatar file"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickAvatar(f); }} />
            <button type="button" className={styles.ghost} onClick={() => avatarInput.current?.click()}>{row?.avatar_path || avatarPick || avatarLibrary ? 'Replace avatar' : 'Upload avatar'}</button>
            <LibraryButton kind="image" label="avatar" onChoose={chooseAvatar} />
            <span className={styles.note}>SVG, PNG, JPG or WebP, square, up to 2 MB. Applied when you press Save changes.</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div>
          <h2>Greeting voice</h2>
          <p>Plays once after the child taps to enter.</p>
        </div>
        <div className={styles.row}>
          {shown('greeting') && (
            <button type="button" className={styles.playBtn} aria-label={playing === fileKey('greeting') ? 'Pause greeting' : 'Play greeting'} onClick={() => toggle('greeting')}>{icon(playing === fileKey('greeting'))}</button>
          )}
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>{baseName(shown('greeting')) ?? 'No greeting yet'}</div>
            <div className={styles.rowMeta}>Audio file, MP3 or similar</div>
          </div>
          {soundActions('greeting', 'greeting', !!row?.greeting_path, false)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.head} style={{ alignItems: 'flex-end' }}>
          <div>
            <h2>Background music</h2>
            <p>Instrumental, royalty-free. The selected track loops quietly.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{soundActions('music', 'background music', !!row?.music_path, false)}</div>
        </div>
        <div className={`${styles.row} ${shown('music') ? styles.rowSel : ''}`}>
          {shown('music') && (
            <button type="button" className={styles.playBtn} aria-label={playing === fileKey('music') ? 'Pause track' : 'Play track'} onClick={() => toggle('music')}>{icon(playing === fileKey('music'))}</button>
          )}
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>{baseName(shown('music')) ?? 'No track yet'}</div>
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
          { kind: 'hooray', title: 'Hooray', hint: 'Plays when the child picks the correct answer.', saved: row?.hooray_path ?? null },
          { kind: 'ohoh', title: 'Oh-oh', hint: 'Plays when the child picks a wrong answer.', saved: row?.ohoh_path ?? null },
          { kind: 'complete', title: 'You did it', hint: 'Plays when a quiz set is finished (replaces the applause and spoken praise).', saved: row?.complete_path ?? null },
        ] as const).map((it) => {
          const path = shown(it.kind);
          const on = playing === (path ? fileKey(it.kind) : `builtin:${it.kind}`);
          return (
            <div key={it.kind} className={styles.row}>
              <button type="button" className={styles.playBtn} aria-label={`${on ? 'Pause' : 'Play'} ${it.title} sound`} onClick={() => (path ? toggle(it.kind) : previewBuiltIn(it.kind))}>{icon(on)}</button>
              <div className={styles.rowText}>
                <div className={styles.rowTitle}>{it.title}: <span style={{ fontWeight: 600 }}>{baseName(path) ?? 'built-in sound'}</span></div>
                <div className={styles.rowMeta}>{it.hint}</div>
              </div>
              {soundActions(it.kind, `${it.title} sound`, !!it.saved, true)}
            </div>
          );
        })}
      </section>

      {toast && <div role="status" className={`${styles.toast} ${toast.error ? styles.toastErr : ''}`}>{toast.text}</div>}
    </>
  );
}
