'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { playOnce, startMusic } from '@/lib/audio';

type Settings = { child_name: string; greeting_path: string | null; music_path: string | null };

/** Welcome (C1). Nothing plays until the child taps the big button. No text is needed to use it. */
export default function Welcome() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('settings')
      .select('child_name, greeting_path, music_path')
      .eq('id', 1)
      .single()
      .then(({ data }) => setSettings((data as Settings) ?? null));
  }, []);

  function onEnter() {
    setEntered(true);
    playOnce(mediaUrl(settings?.greeting_path));
    startMusic(mediaUrl(settings?.music_path));
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        background: '#FBF4E9',
        fontFamily: "'Baloo 2', sans-serif",
        color: '#5A4038',
      }}
    >
      {settings?.child_name && (
        <p style={{ fontSize: 40, margin: 0 }} aria-label={`Hi ${settings.child_name}`}>
          {settings.child_name}
        </p>
      )}

      {!entered ? (
        <button
          type="button"
          onClick={onEnter}
          aria-label="Tap to enter"
          style={{
            width: 380,
            height: 380,
            borderRadius: 190,
            border: 'none',
            background: '#EBB7BC',
            boxShadow: '0 12px 0 #D9A0A6',
            cursor: 'pointer',
            fontSize: 120,
          }}
        >
          ✦
        </button>
      ) : (
        <Link
          href="/games"
          aria-label="Start game"
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            background: '#9CC3A4',
            boxShadow: '0 12px 0 #7FA889',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 120,
            textDecoration: 'none',
          }}
        >
          ▶
        </Link>
      )}
    </main>
  );
}
