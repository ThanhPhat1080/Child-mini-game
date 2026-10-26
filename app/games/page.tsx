'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { Stage } from '@/components/Stage';
import { Hills } from '@/components/Hills';
import { BackButton } from '@/components/BackButton';

const PITCH = 712;
const N = 3;

/** Game list carousel (C2) — mirrors the GameList board: drag/arrows/keys, 120px swipe threshold. */
export default function Games() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [initials, setInitials] = useState('HM');
  const [avatar, setAvatar] = useState<string | null>(null);
  const startX = useRef(0);
  const scale = useRef(1);
  const moved = useRef(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSupabaseBrowserClient().from('settings').select('child_name, avatar_path').eq('id', 1).single().then(({ data }) => {
      if (!data) return;
      const w = (data.child_name ?? '').trim().split(/\s+/).filter(Boolean);
      if (w.length) setInitials(w.map((x: string) => x[0]).join('').slice(0, 2).toUpperCase());
      setAvatar(mediaUrl(data.avatar_path));
    });
    viewRef.current?.focus();
  }, []);

  const go = (d: number) => { setIdx((v) => Math.max(0, Math.min(N - 1, v + d))); setDx(0); setDragging(false); };
  const base = 640 - idx * PITCH;
  const trans = dragging ? 'none' : 'transform .7s cubic-bezier(.3,.7,.2,1), opacity .7s ease';
  const card = (i: number) => ({
    flex: 'none', width: 640, height: 640, borderRadius: 64, background: '#fff', boxShadow: '0 18px 0 #E3CFC0', boxSizing: 'border-box' as const,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 30,
    transform: `scale(${i === idx ? 1 : 0.86})`, opacity: i === idx ? 1 : 0.7, transition: trans, color: '#5A4038',
  });

  return (
    <Stage>
      <Hills />
      <div
        ref={viewRef}
        className="hm-view"
        tabIndex={0}
        aria-label="Games. Use left and right arrows or drag to browse."
        style={{ position: 'absolute', inset: 0 }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
          else if (e.key === 'Enter' && idx === 0) router.push('/games/quiz');
        }}
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); scale.current = r.width / 1920 || 1; startX.current = e.clientX; moved.current = false; setDragging(true); setDx(0); }}
        onPointerMove={(e) => { if (!dragging) return; const d = (e.clientX - startX.current) / scale.current; setDx(d); if (Math.abs(d) > 10) moved.current = true; }}
        onPointerUp={() => { if (!dragging) return; let n = idx; if (dx < -120) n = Math.min(N - 1, n + 1); else if (dx > 120) n = Math.max(0, n - 1); setIdx(n); setDx(0); setDragging(false); }}
        onPointerCancel={() => { setDragging(false); setDx(0); }}
        onPointerLeave={() => { if (dragging) { setDragging(false); setDx(0); } }}
      >
        <div style={{ position: 'absolute', top: 210, left: 0, display: 'flex', gap: 72, transform: `translateX(${base + dx}px)`, transition: dragging ? 'none' : 'transform .7s cubic-bezier(.3,.7,.2,1)' }}>
          <Link href="/games/quiz" draggable={false} aria-label="Play Quiz" onClick={(e) => { if (moved.current) e.preventDefault(); }} style={{ ...card(0), border: '14px solid #EBB7BC' }}>
            <span style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
              <span style={{ width: 120, height: 150, borderRadius: 24, background: '#EBB7BC', padding: 12, boxSizing: 'border-box', fontSize: 36, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>1</span>
              <span style={{ width: 120, height: 190, borderRadius: 24, background: '#A9C6DE', padding: 12, boxSizing: 'border-box', fontSize: 36, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>2</span>
              <span style={{ width: 120, height: 150, borderRadius: 24, background: '#EED79A', padding: 12, boxSizing: 'border-box', fontSize: 36, fontWeight: 600, color: '#8A6A2A', lineHeight: 1.1 }}>3</span>
            </span>
            <svg aria-hidden="true" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#B8737B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
            <span style={{ fontSize: 64, fontWeight: 600, color: '#B8737B', lineHeight: 1 }}>Quiz</span>
          </Link>

          <div style={{ ...card(1), border: '14px solid #A9C6DE' }}>
            <div style={{ display: 'flex', gap: 18 }}>
              {['#9CC3A4', '#EED79A'].map((c) => (
                <span key={c} style={{ width: 160, height: 160, borderRadius: 28, background: '#DCE8F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg aria-hidden="true" width="100" height="100" viewBox="0 0 100 100"><circle cx="34" cy="40" r="18" fill="#E59AA1" /><path d="M64 70 L 84 70 L 74 48 Z" fill={c} /><rect x="20" y="66" width="22" height="22" rx="4" fill="#8FB3D1" /></svg>
                </span>
              ))}
            </div>
            <svg aria-hidden="true" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#5F86A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7" /><path d="M21 21l-5.2-5.2" /></svg>
            <span style={{ fontSize: 52, fontWeight: 600, color: '#5F86A8', lineHeight: 1.05, textAlign: 'center' }}>Spot the<br />Differences</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 22px', borderRadius: 999, background: '#EEF3F7', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 24, color: '#5F7488' }}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Coming in Phase 2
            </span>
          </div>

          <div style={{ ...card(2), border: '10px dashed #E3D5C4', background: '#FFFDF9', boxShadow: 'none' }}>
            <svg aria-hidden="true" width="150" height="100" viewBox="0 0 60 40" fill="#F1E7DA"><ellipse cx="22" cy="24" rx="18" ry="12" /><ellipse cx="38" cy="20" rx="16" ry="14" /></svg>
            <span style={{ fontSize: 48, fontWeight: 600, color: '#B0A094', lineHeight: 1.05, textAlign: 'center' }}>More games<br />soon</span>
          </div>
        </div>
      </div>

      <button type="button" className="hm-arrow hm-tap" aria-label="Previous game" disabled={idx === 0} onClick={() => go(-1)} style={{ position: 'absolute', left: 56, top: 470, width: 120, height: 120, borderRadius: 60, border: 'none', background: '#fff', boxShadow: '0 8px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button type="button" className="hm-arrow hm-tap" aria-label="Next game" disabled={idx === N - 1} onClick={() => go(1)} style={{ position: 'absolute', right: 56, top: 470, width: 120, height: 120, borderRadius: 60, border: 'none', background: '#fff', boxShadow: '0 8px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
      </button>

      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 896, display: 'flex', justifyContent: 'center', gap: 18 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ height: 22, borderRadius: 11, transition: 'width .5s ease', width: i === idx ? 56 : 22, background: i === idx ? '#E59AA1' : '#E3D5C4' }} />
        ))}
      </div>

      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/" label="Back home" home />
        <span style={{ width: 72, height: 72, borderRadius: 36, background: '#F5D9C4', border: '5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 600, color: '#B8737B', overflow: 'hidden', boxSizing: 'border-box' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </span>
      </div>
    </Stage>
  );
}
