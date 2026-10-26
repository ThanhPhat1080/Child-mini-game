'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Stage } from '@/components/Stage';
import { Hills } from '@/components/Hills';
import { BackButton } from '@/components/BackButton';
import { SetCard, type SetCardData } from '@/components/SetCard';
import { MusicButton } from '@/components/MusicButton';

type Row = Omit<SetCardData, 'count'> & { questions: { prompt_text: string | null; prompt_audio_path: string | null; answers: { image_path: string | null; is_correct: boolean }[] }[] };

function isComplete(q: Row['questions'][number]): boolean {
  const a = q.answers;
  return (!!q.prompt_text?.trim() || !!q.prompt_audio_path) && a.length >= 2 && a.length <= 3 && a.every((x) => x.image_path) && a.filter((x) => x.is_correct).length === 1;
}

/** Quiz set selection (C3/C11). Only published sets are visible to anon (RLS). */
export default function QuizSets() {
  const [sets, setSets] = useState<SetCardData[] | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('quiz_sets')
      .select('id, title, subtitle, heading_color, cover_path, questions(prompt_text, prompt_audio_path, answers(image_path, is_correct))')
      .eq('status', 'published')
      .order('position')
      .then(({ data }) => {
        const rows = ((data as unknown as Row[]) ?? []).map((r) => ({ ...r, count: r.questions.filter(isComplete).length })).filter((r) => r.count > 0);
        setSets(rows);
        const d: Record<string, boolean> = {};
        try { rows.forEach((r) => { if (localStorage.getItem(`hamy:done:${r.id}`)) d[r.id] = true; }); } catch { /* storage blocked */ }
        setDone(d);
      });
  }, []);

  return (
    <Stage>
      <Hills />
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/games" label="Back to games" />
        <span style={{ display: 'flex', alignItems: 'center', gap: 16, height: 104, padding: '0 36px 0 24px', borderRadius: 52, background: '#fff', border: '8px solid #EBB7BC', boxSizing: 'border-box' }}>
          <svg aria-hidden="true" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B8737B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
          <span style={{ fontSize: 44, fontWeight: 600, color: '#B8737B', lineHeight: 1 }}>Quiz</span>
        </span>
      </div>
      {sets && sets.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 600, color: '#8A6A5E' }}>
          New quizzes are coming soon!
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 190, display: 'flex', justifyContent: 'center', gap: 64 }}>
        {sets?.map((s, i) => (
          <Link key={s.id} href={`/games/quiz/${s.id}`} className="hm-card" aria-label={`${s.title}, ${s.count} questions${done[s.id] ? ', completed' : ''}`} style={{ borderRadius: 56 }}>
            <SetCard set={s} index={i} done={done[s.id]} />
          </Link>
        ))}
      </div>
      <MusicButton />
    </Stage>
  );
}
