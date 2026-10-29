'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Hills } from '@/components/Hills';
import { Confetti } from '@/components/Confetti';
import { applause, playFile, speakKid } from '@/lib/sfx';
import { handleChoiceKey } from '@/lib/keynav';

const btn = { width: 160, height: 160, borderRadius: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 } as const;

/** Memory Match completion (M7): praise, the flip count for the parent, and two picture buttons. */
export function MemoryDone({ flips, childName, completeUrl, onAgain, levelsHref }: {
  flips: number; childName: string; completeUrl: string | null; onAgain: () => void; levelsHref: string;
}) {
  const router = useRouter();
  const greeting = `You did it${childName ? `, ${childName}` : ''}!`;

  const spoken = useRef(false);
  useEffect(() => {
    if (spoken.current) return;
    spoken.current = true;
    if (completeUrl) { playFile(completeUrl); return; }
    applause(3);
    speakKid(greeting, { pitch: 1.9, rate: 0.9 });
  }, [completeUrl, greeting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push(levelsHref);
      else handleChoiceKey(e, Array.from(document.querySelectorAll<HTMLElement>('[data-done-btn]')));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, levelsHref]);

  return (
    <div data-memory-done style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
      <Hills variant="double" />
      <Confetti count={36} delayStep={0.6} />
      <div className="hm-float" style={{ position: 'absolute', left: 220, top: 340, width: 289, height: 682 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/girl.webp" alt="" width={289} height={682} style={{ display: 'block', width: 289, height: 682 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44, paddingBottom: 60, boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, maxWidth: 840, textAlign: 'center', lineHeight: 1.08, fontSize: 96, fontWeight: 600, color: '#B8737B' }}>{greeting}</h1>
        <div role="img" aria-label={`${flips} flips`} style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#7A5C50', fontSize: 56, fontWeight: 600 }}>
          <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="#F8DCDF" stroke="#EBB7BC" strokeWidth="1.6" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="3" /><circle cx="12" cy="12" r="2" fill="#fff" stroke="none" /></svg>
          <span aria-hidden="true">{flips}</span>
        </div>
        <div style={{ display: 'flex', gap: 56 }}>
          <button type="button" data-done-btn autoFocus onClick={onAgain} className="hm-tap" aria-label="Play again" style={{ ...btn, background: '#9CC3A4', boxShadow: '0 12px 0 #7FA889' }}>
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
          </button>
          <Link href={levelsHref} data-done-btn className="hm-tap" aria-label="Choose level" style={{ ...btn, background: '#fff', boxShadow: '0 12px 0 #EADCC8' }}>
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="#B8737B" stroke="#B8737B" strokeWidth="1" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
