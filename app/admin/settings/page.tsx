'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl, uploadMedia } from '@/lib/media';

type Row = { child_name: string; greeting_path: string | null; music_path: string | null };

const field = { height: 46, padding: '0 14px', borderRadius: 12, border: '1.5px solid #E3D5C4', font: 'inherit' } as const;
const button = { height: 42, padding: '0 16px', borderRadius: 12, border: '1.5px solid #E3D5C4', background: '#FFFFFF', font: 'inherit', fontWeight: 700, cursor: 'pointer' } as const;

export default function SettingsPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [childName, setChildName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from('settings')
      .select('child_name, greeting_path, music_path')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setRow(data as Row);
        setChildName((data as Row).child_name);
      });
  }, []);

  async function onSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('Saving…');
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('settings').update({ child_name: childName.trim() }).eq('id', 1);
    if (error) return (setError(error.message), setStatus(null));
    setRow((r) => (r ? { ...r, child_name: childName.trim() } : r));
    setStatus('Saved.');
  }

  async function onUpload(kind: 'greeting' | 'music', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus('Uploading…');
    try {
      const path = await uploadMedia(kind, file);
      const column = kind === 'greeting' ? 'greeting_path' : 'music_path';
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from('settings').update({ [column]: path }).eq('id', 1);
      if (error) throw new Error(error.message);
      setRow((r) => (r ? { ...r, [column]: path } : r));
      setStatus('Uploaded.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setStatus(null);
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: '48px auto', padding: 24, display: 'grid', gap: 28 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Settings</h1>

      <form onSubmit={onSaveName} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
          Child's name
          <input style={field} value={childName} onChange={(e) => setChildName(e.target.value)} />
        </label>
        <div>
          <button type="submit" style={{ ...button, background: '#5A4038', color: '#FFFFFF' }}>Save name</button>
        </div>
      </form>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Greeting audio</h2>
        <input type="file" accept="audio/*" onChange={(e) => onUpload('greeting', e)} />
        {mediaUrl(row?.greeting_path) ? <audio controls src={mediaUrl(row?.greeting_path) ?? undefined} /> : <p>No greeting yet.</p>}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Background music (loops)</h2>
        <input type="file" accept="audio/*" onChange={(e) => onUpload('music', e)} />
        {mediaUrl(row?.music_path) ? <audio controls src={mediaUrl(row?.music_path) ?? undefined} /> : <p>No music yet.</p>}
      </section>

      {status && <p role="status" style={{ margin: 0 }}>{status}</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700 }}>{error}</p>}
    </main>
  );
}
