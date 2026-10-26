'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Stage } from '@/components/Stage';
import { MusicToggle } from '@/components/MusicToggle';
import { BackButton } from '@/components/BackButton';
import { SetCard, type SetCardData } from '@/components/SetCard';

type Row = Omit<SetCardData, 'count'> & { questions: { count: number }[] };

/** Quiz set selection (C3/C11). Only published sets are visible to anon (RLS). */
export default function QuizSets() {
  const [sets, setSets] = useState<SetCardData[] | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    createSupabaseBrowserClient()
      .from('quiz_sets')
      .select('id, title, subtitle, heading_color, cover_path, questions(count)')
      .eq('status', 'published')
      .order('position')
      .then(({ data }) => {
        const rows = ((data as unknown as Row[]) ?? []).map((r) => ({ ...r, count: r.questions?.[0]?.count ?? 0 })).filter((r) => r.count > 0);
        setSets(rows);
        const d: Record<string, boolean> = {};
        try { rows.forEach((r) => { if (localStorage.getItem(`hamy:done:${r.id}`)) d[r.id] = true; }); } catch { /* storage blocked */ }
        setDone(d);
      });
  }, []);

  return (
    <Stage>
      <div style={{ position: 'absolute', top: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton href="/games" />
        <MusicToggle />
      </div>
      {sets && sets.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 600, color: '#8A6A5E' }}>
          New quizzes are coming soon!
        </div>
      )}
      <div style={{ position: 'absolute', top: 220, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 64 }}>
        {sets?.map((s) => (
          <Link key={s.id} href={`/games/quiz/${s.id}`} aria-label={s.title}>
            <SetCard set={s} done={done[s.id]} />
          </Link>
        ))}
      </div>
    </Stage>
  );
}
