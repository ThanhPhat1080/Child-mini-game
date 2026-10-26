'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Stage } from '@/components/Stage';
import { MusicToggle } from '@/components/MusicToggle';
import { BackButton } from '@/components/BackButton';
import { Confetti } from '@/components/Confetti';

const pill = { height: 120, padding: '0 56px', borderRadius: 60, display: 'flex', alignItems: 'center', fontSize: 44, fontWeight: 600, textDecoration: 'none' } as const;

/** Set completed (C7). Saves the star for this set (localStorage, per set id). */
export default function Done() {
  const { setId } = useParams<{ setId: string }>();
  const [name, setName] = useState('');

  useEffect(() => {
    try { localStorage.setItem(`hamy:done:${setId}`, '1'); } catch { /* storage blocked */ }
    createSupabaseBrowserClient().from('settings').select('child_name').eq('id', 1).single().then(({ data }) => setName(data?.child_name ?? ''));
  }, [setId]);

  return (
    <Stage>
      <Confetti count={140} originX={960} originY={400} />
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/games/quiz" />
        <MusicToggle />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/girl.webp" alt="" style={{ position: 'absolute', left: 90, bottom: 0, height: 860 }} />
      <div style={{ position: 'absolute', left: 560, right: 0, top: 150, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <svg aria-hidden="true" width="260" height="260" viewBox="0 0 24 24" fill="#EED79A" stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
        <span style={{ fontSize: 120, fontWeight: 700, color: '#B8737B', lineHeight: 1 }}>Hooray{name ? `, ${name}` : ''}!</span>
        <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
          <Link href={`/games/quiz/${setId}`} style={{ ...pill, background: '#EBB7BC', boxShadow: '0 10px 0 #D9A0A6', color: '#fff' }}>Play again</Link>
          <Link href="/games/quiz" style={{ ...pill, background: '#9CC3A4', boxShadow: '0 10px 0 #7FA889', color: '#fff' }}>More quizzes</Link>
          <Link href="/" style={{ ...pill, background: '#fff', boxShadow: '0 10px 0 #EADCC8', color: '#7A5C50' }}>Home</Link>
        </div>
      </div>
    </Stage>
  );
}
