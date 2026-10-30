'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage } from '@/components/Stage';
import { Hills } from '@/components/Hills';
import { BackButton } from '@/components/BackButton';
import { MusicButton } from '@/components/MusicButton';
import { ListenHelp } from '@/components/ListenHelp';
import { ListenQuestion } from '@/components/listen/ListenQuestion';
import { fetchActiveCards, sayWord, stopWord } from '@/lib/memory/cards';
import { preloadImages } from '@/lib/memory/preload';
import { buildRounds, type Question } from '@/lib/listen/rounds';
import { clearWrong, recordWrong } from '@/lib/listen/wrongLog';
import { mediaUrl } from '@/lib/media';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ohOh, yay, type SoundHandle } from '@/lib/sfx';
import { handleChoiceKey } from '@/lib/keynav';
import type { MemoryCard } from '@/lib/memory/types';

/** A new question's word comes a short pause after it appears (L3). */
export const SAY_AFTER_SHOW_MS = 600;
/** After a wrong pick the word comes again once the oh-oh has started fading (L4). */
export const SAY_AFTER_WRONG_MS = 700;
/** Longest wait for the hooray before the right word is said (L5). */
export const HOORAY_CAP_MS = 1800;
/** A breath between the end of the right word and the next question. */
export const NEXT_PAUSE_MS = 400;
/** After the last right word, the pause before the finish screen. */
export const FINISH_DELAY_MS = 1000;
/** The next question comes at the latest this long after a right pick, even if the voice never reports its end. */
export const STEP_CAP_MS = 4000;

const answerEls = () => Array.from(document.querySelectorAll<HTMLElement>('[data-answer]'));
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** Listen & Pick (L1-L5, L8, L10): hear a word, pick its picture out of three. No timers on the child, no penalty. */
export default function ListenPlay() {
  const [phase, setPhase] = useState<'loading' | 'empty' | 'play' | 'done'>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<ReadonlySet<number>>(() => new Set());
  const [locked, setLocked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [help, setHelp] = useState(false);
  const [reduced, setReduced] = useState(false);
  const helpBtn = useRef<HTMLButtonElement>(null);
  const sounds = useRef<{ hooray: string | null; ohoh: string | null }>({ hooray: null, ohoh: null });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const alive = useRef(true);
  /** Bumped by every word, so only the newest word's end counts. */
  const wordSeq = useRef(0);
  /** The pending delayed word (after showing a question or a wrong pick); a newer one replaces it. */
  const pendingSay = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guards picks synchronously (two clicks or keys before React re-renders). */
  const lockedRef = useRef(false);
  const wrongRef = useRef(new Set<number>());
  /** The right pick being resolved; the normal path and the cap both try to finish it, only the first one counts. */
  const step = useRef<object | null>(null);
  /** The last hooray / oh-oh, stopped when leaving. */
  const sfx = useRef<SoundHandle | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    if (!alive.current) return null;
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    alive.current = true;
    setReduced(reducedMotion());
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const id of pending) clearTimeout(id);
      pending.clear();
      try { sfx.current?.stop(); } catch { /* already stopped */ }
      sfx.current = null;
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      stopWord();
      clearWrong(); // L7: leaving the game clears the wrong-picks log
    };
  }, []);

  // A round starts: clear the log, load the pool, build the questions, preload their pictures, show question 1.
  useEffect(() => {
    let live = true;
    let stopPreload: (() => void) | null = null;
    clearWrong();
    fetchActiveCards().then(
      (cards) => {
        if (!live) return;
        const qs = buildRounds(cards);
        if (!qs) { setPhase('empty'); return; }
        stopPreload = preloadImages(qs.flatMap((q) => q.options.map((c) => mediaUrl(c.image_path))), () => {
          if (!live) return;
          setQuestions(qs);
          setIndex(0);
          setPhase('play');
        });
      },
      () => live && setPhase('empty'),
    );
    return () => { live = false; stopPreload?.(); };
  }, []);

  // Custom hooray / oh-oh sounds (as in Quiz); any error just keeps the built-in ones.
  useEffect(() => {
    let live = true;
    try {
      createSupabaseBrowserClient().from('settings').select('hooray_path, ohoh_path').eq('id', 1).single().then(
        ({ data }) => { if (live && data) sounds.current = { hooray: mediaUrl(data.hooray_path), ohoh: mediaUrl(data.ohoh_path) }; },
        () => undefined,
      );
    } catch { /* no client: built-in sounds */ }
    return () => { live = false; };
  }, []);

  /** Says a word now; `onEnd` runs only if it is still the newest word. */
  const say = useCallback((card: MemoryCard, onEnd?: () => void) => {
    if (!alive.current) return;
    const seq = ++wordSeq.current;
    setSpeaking(true);
    sayWord(card, () => {
      if (!alive.current || wordSeq.current !== seq) return;
      setSpeaking(false);
      onEnd?.();
    });
  }, []);

  /** Says a word after `ms`, replacing any word still waiting. */
  const sayLater = useCallback((card: MemoryCard, ms: number) => {
    if (pendingSay.current) { clearTimeout(pendingSay.current); timers.current.delete(pendingSay.current); }
    pendingSay.current = later(() => { pendingSay.current = null; say(card); }, ms);
  }, [later, say]);

  const cancelPendingSay = useCallback(() => {
    if (pendingSay.current) { clearTimeout(pendingSay.current); timers.current.delete(pendingSay.current); }
    pendingSay.current = null;
  }, []);

  const current = phase === 'play' ? questions[index] : undefined;

  // Each new question: fresh state, focus on answer 1, the word after a short pause.
  useEffect(() => {
    if (!current) return;
    lockedRef.current = false;
    wrongRef.current = new Set();
    setWrong(new Set());
    setLocked(false);
    answerEls()[0]?.focus();
    sayLater(current.answer, SAY_AFTER_SHOW_MS);
  }, [current, sayLater]);

  /** Moves on after a right pick, once (the word's end and the cap both call it). */
  const moveOn = useCallback((token: object) => {
    if (step.current !== token) return;
    step.current = null;
    if (index + 1 < questions.length) setIndex(index + 1);
    else setPhase('done');
  }, [index, questions.length]);

  const pick = useCallback((i: 0 | 1 | 2) => {
    const q = current;
    if (!q || lockedRef.current || wrongRef.current.has(i)) return;
    if (i !== q.answerIndex) {
      wrongRef.current.add(i);
      setWrong(new Set(wrongRef.current));
      sfx.current = ohOh(sounds.current.ohoh) ?? null;
      recordWrong(q.answer);
      sayLater(q.answer, SAY_AFTER_WRONG_MS);
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    cancelPendingSay();
    stopWord();
    const handle = yay(sounds.current.hooray) ?? null;
    sfx.current = handle;
    // A file's length is unknown (ms 0): wait the full cap so the word does not talk over it.
    const hooray = handle && handle.ms > 0 ? Math.min(handle.ms, HOORAY_CAP_MS) : HOORAY_CAP_MS;
    const last = index + 1 >= questions.length;
    const token = {};
    step.current = token;
    later(() => say(q.answer, () => later(() => moveOn(token), last ? FINISH_DELAY_MS : NEXT_PAUSE_MS)), hooray);
    // The child never waits on a voice that does not report its end.
    later(() => moveOn(token), last ? STEP_CAP_MS + FINISH_DELAY_MS : STEP_CAP_MS);
  }, [current, index, questions.length, later, say, sayLater, cancelPendingSay, moveOn]);

  const replay = useCallback(() => {
    // Not during the hooray pause: the right word comes on its own and must not be cut.
    if (current && !lockedRef.current) { cancelPendingSay(); say(current.answer); }
  }, [current, cancelPendingSay, say]);

  useEffect(() => {
    if (!current || help) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); pick((Number(e.key) - 1) as 0 | 1 | 2); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); replay(); return; }
      handleChoiceKey(e, answerEls());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, help, pick, replay]);

  const done = phase === 'done';

  return (
    <Stage>
      <div data-listen-play data-done={done ? 'true' : 'false'} className={reduced ? 'hm-reduced' : undefined} style={{ position: 'absolute', inset: 0 }}>
        <Hills />
        <div style={{ position: 'absolute', top: 48, zIndex: 2, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BackButton href="/games" label="Back to games" />
          {/* ---- Task 6: the finish screen replaces this done state (data-done="true": only the Back button). ---- */}
          {!done && (
            <button
              ref={helpBtn}
              type="button"
              className="hm-tap"
              aria-label="What is Listen & Pick? Show how to play"
              onClick={() => setHelp(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, height: 120, padding: '0 40px 0 28px', borderRadius: 60, background: '#fff', border: '8px solid #C9BFE4', boxShadow: '0 8px 0 #EADCC8', boxSizing: 'border-box', fontFamily: 'inherit' }}
            >
              <svg aria-hidden="true" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#7B6BAE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              <span style={{ fontSize: 44, fontWeight: 600, color: '#7B6BAE', lineHeight: 1 }}>Listen &amp; Pick</span>
            </button>
          )}
        </div>
        {phase === 'empty' && (
          <div role="status" aria-label="New cards are coming soon" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="420" height="420" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.5" fill="#F0ECF8" stroke="#C9BFE4" strokeWidth="0.6" />
              <path d="M10.5 8L7.5 10.4H5.6v3.2h1.9l3 2.4z" fill="#7B6BAE" />
              <path d="M13.4 10a2.8 2.8 0 0 1 0 4" fill="none" stroke="#7B6BAE" strokeWidth="1" strokeLinecap="round" />
              <path d="M15.4 8.2a5.4 5.4 0 0 1 0 7.6" fill="none" stroke="#7B6BAE" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {current && (
          <div key={index} className="hm-ls-q" data-question-index={index} data-answer-id={current.answer.id} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <ListenQuestion question={current} wrong={wrong} locked={locked} speaking={speaking} onPick={pick} onReplay={replay} />
          </div>
        )}
        <MusicButton />
        {help && <ListenHelp playHref={null} onClose={() => { setHelp(false); setTimeout(() => helpBtn.current?.focus(), 0); }} />}
      </div>
    </Stage>
  );
}
