'use client';

import Link from 'next/link';
import type { Level } from '@/lib/memory/deck';

const GRID: Record<Level, { cols: number; rows: number }> = {
  12: { cols: 4, rows: 3 },
  24: { cols: 6, rows: 4 },
  30: { cols: 6, rows: 5 },
};

/** Mini card-back grid: 4x3, 6x4 or 6x5 small rounded squares in the flower-back pink. */
function MiniGrid({ level }: { level: Level }) {
  const { cols, rows } = GRID[level];
  return (
    <span aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, width: 264, margin: 'auto' }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <span key={i} style={{ aspectRatio: '1', borderRadius: 12, background: '#F8DCDF', border: '4px solid #EBB7BC', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: '#fff' }} />
        </span>
      ))}
    </span>
  );
}

const box: React.CSSProperties = {
  display: 'flex', width: 360, height: 360, borderRadius: 56, background: '#fff', border: '8px solid #EBB7BC',
  boxShadow: '0 8px 0 #EADCC8', boxSizing: 'border-box', padding: 32, fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = { fontSize: 46, fontWeight: 600, color: '#8A6A5E', lineHeight: 1 };

/** One level on the level-select screen. Enabled: a link (Enter works natively). Disabled: a dimmed button. The label is decorative. */
export function LevelButton({ level, disabled, href }: { level: Level; disabled: boolean; href: string }) {
  const label = <span aria-hidden="true" style={labelStyle}>{level} cards</span>;
  const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 };
  if (disabled) {
    return (
      <div data-level={level} style={{ ...wrap, opacity: 0.4 }}>
        <button type="button" disabled aria-disabled="true" aria-label={`${level} cards`} style={{ ...box, cursor: 'not-allowed' }}>
          <MiniGrid level={level} />
        </button>
        {label}
      </div>
    );
  }
  return (
    <div data-level={level} style={wrap}>
      <Link href={href} data-level-link draggable={false} className="hm-card" aria-label={`${level} cards`} style={box}>
        <MiniGrid level={level} />
      </Link>
      {label}
    </div>
  );
}
