'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stage } from '@/components/Stage';
import { MusicToggle } from '@/components/MusicToggle';
import { BackButton } from '@/components/BackButton';

const CARDS = [
  { key: 'quiz', title: 'Quiz', bg: '#F8DCDF', ring: '#E59AA1', href: '/games/quiz', locked: false },
  { key: 'spot', title: 'Spot the Differences', bg: '#DCE8F1', ring: '#8FB3D1', href: null, locked: true },
  { key: 'soon', title: 'More games soon', bg: '#F7ECCB', ring: '#E5C979', href: null, locked: true },
];
const DRAG = 12; // click-vs-drag threshold (ADR-018)

/** Game list carousel (C2). */
export default function Games() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const start = useRef<number | null>(null);
  const dragged = useRef(false);
  const go = useCallback((d: number) => setI((v) => Math.min(CARDS.length - 1, Math.max(0, v + d))), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Enter') { const c = CARDS[i]; if (c.href) router.push(c.href); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, router]);

  return (
    <Stage>
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/" />
        <MusicToggle />
      </div>
      <div
        style={{ position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 56, touchAction: 'pan-y' }}
        onPointerDown={(e) => { start.current = e.clientX; dragged.current = false; }}
        onPointerMove={(e) => { if (start.current !== null && Math.abs(e.clientX - start.current) > DRAG) dragged.current = true; }}
        onPointerUp={(e) => {
          if (start.current !== null && dragged.current) go(e.clientX < start.current ? 1 : -1);
          start.current = null;
        }}
      >
        <Arrow dir={-1} disabled={i === 0} onClick={() => go(-1)} />
        {CARDS.map((c, n) => {
          const active = n === i;
          const body = (
            <div style={{ width: 560, height: 560, borderRadius: 64, border: `14px solid ${c.ring}`, background: c.bg, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontSize: 64, fontWeight: 700, color: '#5A4038', opacity: active ? (c.locked ? 0.7 : 1) : 0.35, transform: active ? 'scale(1)' : 'scale(0.8)', transition: 'all .5s ease', boxShadow: '0 16px 0 rgba(90,64,56,0.12)' }}>
              {c.title}
              {c.locked && <span aria-label="Locked" style={{ position: 'absolute', fontSize: 0 }} />}
            </div>
          );
          return c.href && active ? (
            <Link key={c.key} href={c.href} draggable={false} onClick={(e) => { if (dragged.current) e.preventDefault(); }}>{body}</Link>
          ) : (
            <div key={c.key} onClick={() => { if (!dragged.current) setI(n); }}>{body}</div>
          );
        })}
        <Arrow dir={1} disabled={i === CARDS.length - 1} onClick={() => go(1)} />
      </div>
      <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20 }}>
        {CARDS.map((c, n) => (
          <span key={c.key} style={{ width: 28, height: 28, borderRadius: 14, background: n === i ? '#E59AA1' : '#EADCC8' }} />
        ))}
      </div>
    </Stage>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={dir < 0 ? 'Previous game' : 'Next game'} disabled={disabled} onClick={onClick} style={{ width: 120, height: 120, borderRadius: 60, border: 'none', background: '#fff', boxShadow: '0 8px 0 #EADCC8', opacity: disabled ? 0.3 : 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
    </button>
  );
}
