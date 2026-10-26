'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Stage } from '@/components/Stage';
import { Hills } from '@/components/Hills';
import { Confetti } from '@/components/Confetti';

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
const btn = { width: 160, height: 160, borderRadius: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

/** Set completed (C7). Saves the star for this set (localStorage, per set id). */
export default function Done() {
  const { setId } = useParams<{ setId: string }>();
  const [name, setName] = useState('');

  useEffect(() => {
    try { localStorage.setItem(`hamy:done:${setId}`, '1'); } catch { /* storage blocked */ }
    createSupabaseBrowserClient().from('settings').select('child_name').eq('id', 1).single().then(({ data }) => setName(data?.child_name ?? ''));
  }, [setId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.location.href = '/games/quiz'; };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Stage>
      <Hills variant="double" />
      <Confetti count={140} delayStep={0.22} />
      <div className="hm-float" style={{ position: 'absolute', left: 130, top: 340, width: 289, height: 682 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/girl.webp" alt="" width={289} height={682} style={{ display: 'block', width: 289, height: 682 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44, paddingBottom: 60, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 28 }} role="img" aria-label="3 stars earned">
          {[150, 180, 150].map((w, i) => (
            <svg key={i} aria-hidden="true" width={w} height={w} viewBox="0 0 24 24" fill="#EED79A" stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round" style={i === 1 ? { marginTop: -30 } : undefined}><path d={STAR} /></svg>
          ))}
        </div>
        <h1 style={{ margin: 0, fontSize: 96, fontWeight: 600, color: '#B8737B' }}>You did it{name ? `, ${name}` : ''}!</h1>
        <div style={{ display: 'flex', gap: 56 }}>
          <Link href={`/games/quiz/${setId}`} className="hm-tap" aria-label="Play this set again" style={{ ...btn, background: '#fff', boxShadow: '0 12px 0 #EADCC8' }}>
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#B8737B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
          </Link>
          <Link href="/games/quiz" className="hm-tap hm-breathe" autoFocus aria-label="Choose another set" style={{ ...btn, background: '#9CC3A4', boxShadow: '0 12px 0 #7FA889' }}>
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
          </Link>
          <Link href="/" className="hm-tap" aria-label="Go home" style={{ ...btn, background: '#fff', boxShadow: '0 12px 0 #EADCC8' }}>
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
          </Link>
        </div>
      </div>
    </Stage>
  );
}
