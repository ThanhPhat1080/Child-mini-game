'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { SLOT_COLORS } from '@/lib/tokens';
import { Stage } from '@/components/Stage';
import { BackButton } from '@/components/BackButton';
import { MusicButton } from '@/components/MusicButton';
import { ohOh, yay, speakKid } from '@/lib/sfx';
import { Confetti } from '@/components/Confetti';

type Answer = { slot: number; image_path: string | null; text: string | null; is_correct: boolean };
type Question = { id: string; position: number; prompt_text: string | null; prompt_image_path: string | null; prompt_audio_path: string | null; answers: Answer[] };

const BADGE = ['#C77D85', '#5F86A8', '#8A6A2A'];
const SHADOW = ['#D9A0A6', '#7FA0BE', '#D2B466'];

let voiceEl: HTMLAudioElement | null = null;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Speaks text (or plays a recorded file) and resolves when finished. */
function say(t: string | null, audioUrl?: string | null): Promise<void> {
  return new Promise((resolve) => {
    voiceEl?.pause();
    if (audioUrl) {
      voiceEl = new Audio(audioUrl);
      voiceEl.onended = () => resolve();
      voiceEl.onerror = () => resolve();
      voiceEl.play().catch(() => resolve());
    } else if (t?.trim()) speakKid(t, { pitch: 1.5, rate: 0.8, onEnd: resolve });
    else resolve();
  });
}
function stopVoice() {
  voiceEl?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Question screen (C4/C5/C6). */
export default function QuestionPage() {
  const { setId } = useParams<{ setId: string }>();
  const [qs, setQs] = useState<Question[] | null>(null);
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ping, setPing] = useState(0);
  const [reading, setReading] = useState(false);
  const token = useRef(0);
  const readToken = useRef(0);
  const [readIdx, setReadIdx] = useState<number | null>(null);
  const [result, setResult] = useState<'wrong' | 'correct' | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('questions')
      .select('id, position, prompt_text, prompt_image_path, prompt_audio_path, answers(slot, image_path, text, is_correct)')
      .eq('set_id', setId)
      .order('position')
      .then(({ data }) => {
        const rows = ((data as unknown as Question[]) ?? []).map((r) => ({ ...r, answers: [...r.answers].sort((a, b) => a.slot - b.slot) }));
        setQs(rows.filter((r) => (!!r.prompt_text?.trim() || !!r.prompt_audio_path) && r.answers.length >= 2 && r.answers.every((a) => a.image_path) && r.answers.filter((a) => a.is_correct).length === 1));
      });
  }, [setId]);

  const cur = qs?.[q];
  const last = qs ? q === qs.length - 1 : false;

  const pick = useCallback(
    (i: number) => {
      if (!cur || result === 'correct') return;
      const a = cur.answers[i];
      if (!a) return;
      if (reading) return;
      readToken.current++;
      stopVoice();
      setReadIdx(null);
      setPicked(i);
      setReading(true);
      // read the child's answer aloud first, then show hooray / oh-oh with its sound
      const mine = token.current;
      const finish = () => {
        if (mine !== token.current) return;
        const show = () => {
          if (mine !== token.current) return;
          setReading(false);
          setResult(a.is_correct ? 'correct' : 'wrong');
          if (a.is_correct) yay(); else ohOh();
        };
        if (a.is_correct) show(); else setTimeout(show, 1000); // wrong: pause 1 s after her answer is read
      };
      if (a.text?.trim()) speakKid(a.text.trim(), { pitch: 1.5, rate: 0.8, onEnd: finish });
      else finish();
    },
    [cur, result, reading],
  );

  useEffect(() => {
    if (result !== 'wrong') return;
    const t = setTimeout(() => { setResult(null); setPicked(null); }, 2000);
    return () => clearTimeout(t);
  }, [result, picked]);

  const jump = (i: number) => { token.current++; setReading(false); setQ(i); setPicked(null); setResult(null); };

  const next = useCallback(() => {
    token.current++;
    setReading(false);
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

  const readAll = useCallback(async (qq: Question) => {
    const my = ++readToken.current;
    const alive = () => my === readToken.current;
    stopVoice();
    await wait(500); // half a second, then read the question
    if (!alive()) return;
    await say(qq.prompt_text, mediaUrl(qq.prompt_audio_path));
    for (let i = 0; i < qq.answers.length; i++) {
      const t = qq.answers[i].text?.trim();
      if (!t) continue;
      await wait(1000); // 1 s between answers
      if (!alive()) return;
      setReadIdx(i);
      await say(t);
      if (!alive()) return;
      setReadIdx(null);
    }
  }, []);

  useEffect(() => {
    const rt = readToken;
    if (cur) void readAll(cur);
    return () => { rt.current++; stopVoice(); setReadIdx(null); };
  }, [cur, readAll]);

  if (!cur || !qs) return <Stage><span /></Stage>;
  const qImg = mediaUrl(cur.prompt_image_path);

  return (
    <Stage>
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/games/quiz" label="Back to quiz sets" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', gap: 8 }} role="group" aria-label={`Question ${q + 1} of ${qs.length}`}>
            {qs.map((_, i) => (
              <button key={i} type="button" className="hm-tap" aria-label={`Go to question ${i + 1}`} aria-current={i === q} onClick={() => jump(i)} style={{ padding: 8, border: 'none', background: 'none', borderRadius: 28 }}>
                <span style={{ display: 'block', width: 40, height: 40, borderRadius: 20, boxSizing: 'border-box', border: '6px solid', ...(i < q || (i === q && result === 'correct') ? { background: '#EED79A', borderColor: '#E5C979' } : i === q ? { background: '#fff', borderColor: '#E59AA1' } : { background: '#F1E7DA', borderColor: '#D9C9B6' }) }} />
              </button>
            ))}
          </div>
          <span style={{ fontSize: 48, fontWeight: 600, color: '#8A6A5E', minWidth: 110 }}>{q + 1} / {qs.length}</span>
        </div>
      </div>
      <MusicButton />

      <div style={{ position: 'absolute', top: 172, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 72 }}>
        {qImg && <div style={{ width: 600, height: 300, boxSizing: 'border-box', padding: 20, overflow: 'hidden', borderRadius: 44, background: '#fff', boxShadow: '0 12px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qImg} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <button type="button" className="hm-tap hm-breathe" aria-label="Hear the question again" onClick={() => { void readAll(cur); setPing((n) => n + 1); }} style={{ width: 120, height: 120, borderRadius: 60, border: 'none', background: '#EBB7BC', boxShadow: '0 10px 0 #D9A0A6', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {ping > 0 && <span key={ping} className="hm-ping" aria-hidden="true" />}
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
            <button key={a.slot} type="button" className={`hm-ans${dim ? ' hm-wobble' : ''}${readIdx === i ? ' hm-breathe' : ''}`} aria-label={`Answer ${i + 1}`} onClick={() => pick(i)} style={{ position: 'relative', width: 460, height: 400, borderRadius: 56, border: `14px solid ${c.ring}`, background: c.bg, boxShadow: `0 16px 0 ${SHADOW[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', opacity: dim ? 0.55 : 1 }}>
              <span style={{ position: 'absolute', top: -34, left: -34, width: 104, height: 104, borderRadius: 52, background: BADGE[i], color: '#fff', border: '8px solid #FBF4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 600, boxSizing: 'border-box' }}>{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: a.text?.trim() ? 250 : '100%', objectFit: 'contain' }} />}
              {a.text?.trim() && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', fontSize: 44, fontWeight: 600, color: '#5A4038' }}>{a.text}</span>}
            </button>
          );
        })}
      </div>

      {result === 'wrong' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(251,244,233,0.55)' }}>
          <div role="status" className="hm-rise" style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '36px 64px 36px 40px', borderRadius: 80, background: '#fff', boxShadow: '0 12px 0 #EADCC8' }}>
            <svg aria-hidden="true" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#B8737B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" fill="#F8DCDF" /><path d="M8.5 15.5c1-1 2.2-1.4 3.5-1.4s2.5.4 3.5 1.4" /><path d="M9 9.5h.01" /><path d="M15 9.5h.01" /></svg>
            <span style={{ fontSize: 80, fontWeight: 600, color: '#8A6A5E' }}>Oh-oh… try again!</span>
          </div>
        </div>
      )}

      {result === 'correct' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(251,244,233,0.78)', overflow: 'hidden' }}>
          <span className="hm-flash" aria-hidden="true" style={{ position: 'absolute', left: 560, top: 70, width: 800, height: 800, borderRadius: 400, background: 'radial-gradient(circle, rgba(246,226,166,0.9) 0%, rgba(246,226,166,0) 68%)' }} />
          <Confetti count={56} />
          <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
            <svg className="hm-pop" aria-hidden="true" width="240" height="240" viewBox="0 0 24 24" fill="#EED79A" stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
            <span className="hm-pop" style={{ fontSize: 140, fontWeight: 700, color: '#B8737B', lineHeight: 1 }}>Hooray!</span>
            {last ? (
              <Link href={`/games/quiz/${setId}/done`} className="hm-tap hm-breathe" aria-label="Finish the set" style={nextStyle}><Arrow /></Link>
            ) : (
              <button type="button" className="hm-tap hm-breathe" autoFocus aria-label="Next question" onClick={next} style={{ ...nextStyle, border: 'none' }}><Arrow /></button>
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
