'use client';

import { useEffect, useState } from 'react';
import { Stage } from '@/components/Stage';
import { Hills } from '@/components/Hills';
import { BackButton } from '@/components/BackButton';
import { MusicButton } from '@/components/MusicButton';
import { LevelButton } from '@/components/memory/LevelButton';
import { fetchActiveCards } from '@/lib/memory/cards';
import { LEVELS, levelsAvailable } from '@/lib/memory/deck';
import { handleChoiceKey } from '@/lib/keynav';

const links = () => Array.from(document.querySelectorAll<HTMLElement>('a[data-level-link]'));

/** Memory Match level select (M1): 12 / 24 / 30 cards; a level needs half as many active cards. */
export default function MemoryLevels() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    fetchActiveCards().then((c) => live && setCount(c.length), () => live && setCount(0));
    return () => { live = false; };
  }, []);

  const avail = levelsAvailable(count ?? 0);
  const any = LEVELS.some((l) => avail[l]);

  useEffect(() => {
    if (any) links()[0]?.focus();
  }, [any]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { handleChoiceKey(e, links()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Stage>
      <Hills />
      <div style={{ position: 'absolute', top: 48, zIndex: 2, left: 56, right: 56, display: 'flex', alignItems: 'center' }}>
        <BackButton href="/games" label="Back to games" />
      </div>
      {count === 0 && (
        <div role="status" aria-label="New cards are coming soon" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="480" height="480" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="#F8DCDF" stroke="#EBB7BC" strokeWidth="0.6" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="12" cy="7.8" rx="2" ry="3" fill="#fff" transform={`rotate(${a} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="1.8" fill="#EED79A" />
          </svg>
        </div>
      )}
      {count !== null && count > 0 && (
        <div role="group" aria-label="Choose how many cards" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 96 }}>
          {LEVELS.map((l) => (
            <LevelButton key={l} level={l} disabled={!avail[l]} href={`/games/memory/${l}`} />
          ))}
        </div>
      )}
      <MusicButton />
    </Stage>
  );
}
