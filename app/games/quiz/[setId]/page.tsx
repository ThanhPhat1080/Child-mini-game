'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { SLOT_COLORS } from '@/lib/tokens';
import { Stage } from '@/components/Stage';
import { MusicToggle } from '@/components/MusicToggle';
import { BackButton } from '@/components/BackButton';
import { Confetti } from '@/components/Confetti';

type Answer = { slot: number; image_path: string | null; is_correct: boolean };
type Question = { id: string; position: number; prompt_text: string | null; prompt_image_path: string | null; answers: Answer[] };

const BADGE = ['#C77D85', '#5F86A8', '#8A6A2A'];
const SHADOW = ['#D9A0A6', '#7FA0BE', '#D2B466'];

function speak(text: string | null) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.8;
  window.speechSynthesis.speak(u);
}

/** Question screen (C4/C5/C6). */
export default function QuestionPage() {
  const { setId } = useParams<{ setId: string }>();
  const [qs, setQs] = useState<Question[] | null>(null);
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<'wrong' | 'correct' | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('questions')
      .select('id, position, prompt_text, prompt_image_path, answers(slot, image_path, is_correct)')
      .eq('set_id', setId)
      .order('position')
      .then(({ data }) => {
        const rows = ((data as unknown as Question[]) ?? []).map((r) => ({ ...r, answers: [...r.answers].sort((a, b) => a.slot - b.slot) }));
        setQs(rows);
      });
  }, [setId]);

  const cur = qs?.[q];
  const last = qs ? q === qs.length - 1 : false;

  const pick = useCallback(
    (i: number) => {
      if (!cur || result === 'correct') return;
      const a = cur.answers[i];
      if (!a) return;
      setPicked(i);
      setResult(a.is_correct ? 'correct' : 'wrong');
    },
    [cur, result],
  );

  const next = useCallback(() => {
    setQ((v) => v + 1);
    setPicked(null);
    setResult(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3'].includes(e.key)) pick(Number(e.key) - 1);
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && result === 'correct' && !last) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, next, result, last]);

  useEffect(() => { if (cur) speak(cur.prompt_text); }, [cur]);

  if (!cur || !qs) return <Stage><span /></Stage>;
  const qImg = mediaUrl(cur.prompt_image_path);

  return (
    <Stage>
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/games/quiz" />
        <div style={{ display: 'flex', gap: 20 }} aria-label={`Question ${q + 1} of ${qs.length}`}>
          {qs.map((_, i) => (
            <span key={i} style={{ width: 40, height: 40, borderRadius: 20, boxSizing: 'border-box', border: '6px solid', ...(i < q || (i === q && result === 'correct') ? { background: '#EED79A', borderColor: '#E5C979' } : i === q ? { background: '#fff', borderColor: '#E59AA1' } : { background: '#F1E7DA', borderColor: '#F1E7DA' }) }} />
          ))}
        </div>
        <MusicToggle />
      </div>

      <div style={{ position: 'absolute', top: 172, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 72 }}>
        <div style={{ width: 400, height: 300, boxSizing: 'border-box', padding: 20, overflow: 'hidden', borderRadius: 44, background: '#fff', boxShadow: '0 12px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qImg && <img src={qImg} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <button type="button" aria-label="Hear the question again" onClick={() => speak(cur.prompt_text)} style={{ width: 120, height: 120, borderRadius: 60, border: 'none', background: '#EBB7BC', boxShadow: '0 10px 0 #D9A0A6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg aria-hidden="true" width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" fill="#fff" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
          </button>
          <span style={{ fontSize: 56, fontWeight: 500, color: '#8A6A5E', maxWidth: 620, lineHeight: 1.1, textAlign: 'center' }}>{cur.prompt_text}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 540, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 72 }}>
        {cur.answers.map((a, i) => {
          const c = SLOT_COLORS[i];
          const dim = result === 'wrong' && picked === i;
          const img = mediaUrl(a.image_path);
          return (
            <button key={a.slot} type="button" aria-label={`Answer ${i + 1}`} onClick={() => pick(i)} style={{ position: 'relative', width: 460, height: 400, borderRadius: 56, border: `14px solid ${c.ring}`, background: c.bg, boxShadow: `0 16px 0 ${SHADOW[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', opacity: dim ? 0.55 : 1, cursor: 'pointer', transition: 'opacity .4s ease' }}>
              <span style={{ position: 'absolute', top: -34, left: -34, width: 104, height: 104, borderRadius: 52, background: BADGE[i], color: '#fff', border: '8px solid #FBF4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 600, boxSizing: 'border-box' }}>{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
            </button>
          );
        })}
      </div>

      {result === 'wrong' && (
        <div role="status" style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 24, padding: '24px 48px 24px 28px', borderRadius: 60, background: '#fff', boxShadow: '0 8px 0 #EADCC8' }}>
          <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#B8737B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" fill="#F8DCDF" /><path d="M8.5 15.5c1-1 2.2-1.4 3.5-1.4s2.5.4 3.5 1.4" /><path d="M9 9.5h.01" /><path d="M15 9.5h.01" /></svg>
          <span style={{ fontSize: 48, fontWeight: 500, color: '#8A6A5E' }}>Oh-oh… try again!</span>
        </div>
      )}

      {result === 'correct' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(251,244,233,0.78)', overflow: 'hidden' }}>
          <Confetti count={56} />
          <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
            <svg aria-hidden="true" width="240" height="240" viewBox="0 0 24 24" fill="#EED79A" stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
            <span style={{ fontSize: 140, fontWeight: 700, color: '#B8737B', lineHeight: 1 }}>Hooray!</span>
            {last ? (
              <Link href={`/games/quiz/${setId}/done`} aria-label="Finish the set" style={nextStyle}><Arrow /></Link>
            ) : (
              <button type="button" aria-label="Next question" onClick={next} style={{ ...nextStyle, border: 'none', cursor: 'pointer' }}><Arrow /></button>
            )}
          </div>
        </div>
      )}
    </Stage>
  );
}

const nextStyle = { width: 176, height: 176, borderRadius: 88, background: '#9CC3A4', boxShadow: '0 12px 0 #7FA889', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
function Arrow() {
  return <svg aria-hidden="true" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
}
