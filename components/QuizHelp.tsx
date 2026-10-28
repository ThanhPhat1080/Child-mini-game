'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const ROSE = '#EBB7BC';
const SKY = '#A9C6DE';
const BUTTER = '#EED79A';
const SOFT = '#8A6A5E';

type Slide = { title: string; text: string; art: ReactNode };

const speaker = (
  <svg aria-hidden="true" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" fill="#fff" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);

/** A small answer card like the ones on the question screen. */
function Mini({ n, bg, ring, ink, children, tapped }: { n: number; bg: string; ring: string; ink: string; children?: ReactNode; tapped?: boolean }) {
  return (
    <span style={{ position: 'relative', width: 170, height: 150, borderRadius: 30, background: bg, border: `8px solid ${ring}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tapped ? `0 0 0 10px #fff, 0 0 0 16px ${ring}` : 'none' }}>
      <span style={{ position: 'absolute', top: -20, left: -20, width: 50, height: 50, borderRadius: 25, background: ink, color: '#fff', border: '5px solid #fff', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>{n}</span>
      {children}
    </span>
  );
}

const SLIDES: Slide[] = [
  {
    title: 'What is Quiz?',
    text: 'A calm picture game. The child hears a question, then picks the right picture. No timer and no penalties, just slow and gentle play.',
    art: (
      <span style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <Mini n={1} bg="#F8DCDF" ring={ROSE} ink="#C77D85"><span style={{ width: 54, height: 54, borderRadius: 27, background: '#E5555F' }} /></Mini>
        <Mini n={2} bg="#DCE8F1" ring={SKY} ink="#5F86A8"><span style={{ width: 54, height: 54, borderRadius: 10, background: '#4F7A9E' }} /></Mini>
        <Mini n={3} bg="#F7ECCB" ring="#E5C979" ink="#8A6A2A"><span style={{ width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderBottom: '54px solid #7FB38A' }} /></Mini>
      </span>
    ),
  },
  {
    title: 'Listen first',
    text: 'Each question is read aloud. Tap the round speaker to hear it again. The answers are read one by one.',
    art: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <span style={{ position: 'relative', width: 140, height: 140, borderRadius: 70, background: '#EBB7BC', boxShadow: '0 10px 0 #D9A0A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{speaker}</span>
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 90 }} aria-hidden="true">
          {[40, 72, 54, 86, 46, 66, 36].map((h, i) => <i key={i} style={{ display: 'block', width: 16, height: h, borderRadius: 8, background: i % 2 ? '#F0C9CD' : ROSE }} />)}
        </span>
      </span>
    ),
  },
  {
    title: 'Pick an answer',
    text: 'Tap a card, or press 1, 2 or 3 on the keyboard. A right answer makes a happy hooray. A wrong one makes a soft “oh-oh” and you try again.',
    art: (
      <span style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <Mini n={1} bg="#F8DCDF" ring={ROSE} ink="#C77D85" tapped><span style={{ width: 54, height: 54, borderRadius: 27, background: '#E5555F' }} /></Mini>
        <Mini n={2} bg="#DCE8F1" ring={SKY} ink="#5F86A8"><span style={{ width: 54, height: 54, borderRadius: 10, background: '#4F7A9E' }} /></Mini>
        <Mini n={3} bg="#F7ECCB" ring="#E5C979" ink="#8A6A2A"><span style={{ width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderBottom: '54px solid #7FB38A' }} /></Mini>
      </span>
    ),
  },
  {
    title: 'Fill the dots',
    text: 'Every right answer turns a dot yellow. Tap a dot to jump to a question. Finish all of them to earn the stars. Progress is kept on this device.',
    art: (
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <span style={{ display: 'flex', gap: 16 }} aria-hidden="true">
          {[true, true, true, false, false].map((done, i) => (
            <span key={i} style={{ width: 52, height: 52, borderRadius: 26, boxSizing: 'border-box', border: '7px solid', background: done ? BUTTER : '#F1E7DA', borderColor: done ? '#E5C979' : i === 3 ? '#E59AA1' : '#D9C9B6' }} />
          ))}
        </span>
        <span style={{ display: 'flex', gap: 14 }} aria-hidden="true">
          {[1, 1.25, 1].map((k, i) => (
            <svg key={i} width={72 * k} height={72 * k} viewBox="0 0 24 24" fill={BUTTER} stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
          ))}
        </span>
      </span>
    ),
  },
];

const playStyle = { height: 120, padding: '0 44px', borderRadius: 60, background: '#C77D85', boxShadow: '0 8px 0 #A8636B', display: 'flex', alignItems: 'center', gap: 14, color: '#fff', fontSize: 48, fontWeight: 700, textDecoration: 'none' } as const;
const playIcon = <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l10.5-6.5z" /></svg>;

const round = { width: 120, height: 120, borderRadius: 60, border: 'none', background: '#FBF4E9', boxShadow: '0 8px 0 #E3CFC0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } as const;

/** Tutorial popup for the Quiz game: a short description plus a carousel of steps. */
export function QuizHelp({ onClose, playHref = '/games/quiz' }: { onClose: () => void; /** Where "Play" goes; null when the popup is already on the quiz list, so "Play" just closes it. */ playHref?: string | null }) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const last = i === SLIDES.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)));

  useEffect(() => { dialog.current?.focus(); }, []);

  // keys belong to the popup while it is open (Esc must not also leave the page, arrows must not move the games)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'BrowserBack') { e.preventDefault(); e.stopPropagation(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setI((v) => Math.min(SLIDES.length - 1, v + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setI((v) => Math.max(0, v - 1)); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(90,64,56,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="How to play Quiz"
        tabIndex={-1}
        className="hm-pop"
        style={{ position: 'relative', width: 1280, height: 800, boxSizing: 'border-box', borderRadius: 72, background: '#fff', border: `14px solid ${ROSE}`, boxShadow: '0 20px 0 #E3CFC0', outline: 'none', display: 'flex', flexDirection: 'column', overflow: 'visible' }}
      >
        <button type="button" className="hm-tap" aria-label="Close" onClick={onClose} style={{ ...round, background: '#fff', boxShadow: '0 8px 0 #EADCC8', position: 'absolute', top: -48, right: -48, zIndex: 2 }}>
          <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div style={{ flex: 1, overflow: 'hidden', borderRadius: '58px 58px 0 0' }} aria-live="polite">
          <div style={{ display: 'flex', width: `${SLIDES.length * 100}%`, height: '100%', transform: `translateX(-${(i * 100) / SLIDES.length}%)`, transition: 'transform .6s cubic-bezier(.3,.7,.2,1)' }}>
            {SLIDES.map((s, k) => (
              <section key={k} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${SLIDES.length}`} aria-hidden={k !== i} style={{ width: `${100 / SLIDES.length}%`, height: '100%', boxSizing: 'border-box', padding: '40px 90px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, textAlign: 'center' }}>
                <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.art}</div>
                <h2 style={{ margin: 0, fontSize: 76, fontWeight: 700, color: '#B8737B', lineHeight: 1.05 }}>{s.title}</h2>
                <p style={{ margin: 0, fontSize: 40, fontWeight: 500, color: SOFT, lineHeight: 1.3, maxWidth: 1000 }}>{s.text}</p>
              </section>
            ))}
          </div>
        </div>

        <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px 14px' }}>
          <button type="button" className="hm-tap" aria-label="Previous step" disabled={i === 0} onClick={() => go(i - 1)} style={{ ...round, opacity: i === 0 ? 0.4 : 1 }}>
            <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div role="group" aria-label="Pick a step" style={{ display: 'flex' }}>
            {SLIDES.map((_, k) => (
              <button key={k} type="button" className="hm-tap" aria-label={`Go to step ${k + 1}`} aria-current={k === i} onClick={() => go(k)} style={{ width: 120, height: 120, padding: 0, border: 'none', background: 'none', borderRadius: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ display: 'block', height: 22, borderRadius: 11, transition: 'width .5s ease', width: k === i ? 56 : 22, background: k === i ? '#E59AA1' : '#E3D5C4' }} />
              </button>
            ))}
          </div>
          {last ? (
            playHref ? (
              <Link href={playHref} className="hm-tap" aria-label="Play Quiz" style={playStyle}>
                {playIcon}
                Play
              </Link>
            ) : (
              <button type="button" className="hm-tap" aria-label="Play Quiz" onClick={onClose} style={{ ...playStyle, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {playIcon}
                Play
              </button>
            )
          ) : (
            <button type="button" className="hm-tap" aria-label="Next step" onClick={() => go(i + 1)} style={round}>
              <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
