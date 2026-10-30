'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CelebrationScene } from '@/components/CelebrationScene';
import { applause, playFile, speakKid } from '@/lib/sfx';
import { handleChoiceKey } from '@/lib/keynav';

const btn = { width: 160, height: 160, borderRadius: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 } as const;

/** Spot the Differences completion (S9): praise and two picture buttons (play again, choose level). */
export function SpotDone({ childName, completeUrl, onAgain, levelsHref }: {
  childName: string; completeUrl: string | null; onAgain: () => void; levelsHref: string;
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
    <div data-spot-done style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
      <CelebrationScene greeting={greeting}>
        <button type="button" data-done-btn autoFocus onClick={onAgain} className="hm-tap" aria-label="Play again" style={{ ...btn, background: '#9CC3A4', boxShadow: '0 12px 0 #7FA889' }}>
          <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
        <Link href={levelsHref} data-done-btn className="hm-tap" aria-label="Choose level" style={{ ...btn, background: '#fff', boxShadow: '0 12px 0 #EADCC8' }}>
          <svg aria-hidden="true" width="80" height="80" viewBox="0 0 24 24" fill="#B8737B" stroke="#B8737B" strokeWidth="1" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
        </Link>
      </CelebrationScene>
    </div>
  );
}
