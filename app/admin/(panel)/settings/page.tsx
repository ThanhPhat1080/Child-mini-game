'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl, uploadMedia } from '@/lib/media';
import styles from '../../admin.module.css';

type Row = { child_name: string; greeting_path: string | null; music_path: string | null; music_volume: number };

const baseName = (p: string | null) => (p ? p.split('/').pop() ?? p : null);

export default function SettingsPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [childName, setChildName] = useState('');
  const [volume, setVolume] = useState(30);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const greetingInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLAudioElement | null>(null);

  const say = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('settings')
      .select('child_name, greeting_path, music_path, music_volume')
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
    const { error } = await createSupabaseBrowserClient()
      .from('settings')
      .update({ child_name: childName.trim(), music_volume: volume })
      .eq('id', 1);
    if (error) return say(error.message, true);
    setRow((r) => (r ? { ...r, child_name: childName.trim(), music_volume: volume } : r));
    say('Saved.');
  }

  async function upload(kind: 'greeting' | 'music', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const path = await uploadMedia(kind, file);
      const column = kind === 'greeting' ? 'greeting_path' : 'music_path';
      const { error } = await createSupabaseBrowserClient().from('settings').update({ [column]: path }).eq('id', 1);
      if (error) throw new Error(error.message);
      setRow((r) => (r ? { ...r, [column]: path } : r));
      say('Uploaded.');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Upload failed', true);
    }
  }

  function play(path: string | null) {
    const url = mediaUrl(path);
    if (!url) return;
    preview.current?.pause();
    preview.current = new Audio(url);
    preview.current.volume = kindVolume(path);
    preview.current.play().catch(() => undefined);
  }
  const kindVolume = (path: string | null) => (path && path === row?.music_path ? volume / 100 : 1);

  const PlayIcon = (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M8 5.5v13l10.5-6.5z" /></svg>
  );

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>Settings</h1>
          <p className={styles.sub}>What the child sees and hears on the Welcome screen.</p>
        </div>
        <button type="button" className={styles.primary} style={{ height: 46 }} onClick={save}>Save changes</button>
      </div>

      <section className={`${styles.section} ${styles.profile}`}>
        <div className={styles.avatar}>
          <svg aria-hidden="true" width="54" height="38" viewBox="0 0 60 42" fill="#F6E2A6" stroke="#B08A48" strokeWidth="2" strokeLinejoin="round"><path d="M4 38 L8 10 L20 24 L30 4 L40 24 L52 10 L56 38 Z" /></svg>
        </div>
        <div className={styles.profileBody}>
          <div className={styles.fieldGroup}>
            <label htmlFor="cn">Child&apos;s name</label>
            <input id="cn" className={`${styles.input} ${styles.nameInput}`} type="text" value={childName} onChange={(e) => setChildName(e.target.value)} />
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
            <button type="button" className={styles.playBtn} aria-label="Play greeting" onClick={() => play(row.greeting_path)}>{PlayIcon}</button>
          )}
          <div className={styles.rowText}>
            <div className={styles.rowTitle}>{baseName(row?.greeting_path ?? null) ?? 'No greeting yet'}</div>
            <div className={styles.rowMeta}>Audio file, MP3 or similar</div>
          </div>
          <input ref={greetingInput} className={styles.hidden} type="file" accept="audio/*" onChange={(e) => upload('greeting', e)} />
          <button type="button" className={styles.ghost} onClick={() => greetingInput.current?.click()}>{row?.greeting_path ? 'Replace' : 'Upload'}</button>
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
        </div>
        <div className={`${styles.row} ${row?.music_path ? styles.rowSel : ''}`}>
          {row?.music_path && (
            <button type="button" className={styles.playBtn} aria-label="Play track" onClick={() => play(row.music_path)}>{PlayIcon}</button>
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

      {toast && <div role="status" className={`${styles.toast} ${toast.error ? styles.toastErr : ''}`}>{toast.text}</div>}
    </>
  );
}
