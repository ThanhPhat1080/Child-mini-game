import type { Game } from '@/lib/games/registry';

const num = (bg: string, h: number, n: number, color = '#fff') => (
  <span style={{ width: 120, height: h, borderRadius: 24, background: bg, padding: 12, boxSizing: 'border-box', fontSize: 36, fontWeight: 600, color, lineHeight: 1.1 }}>{n}</span>
);

const miniCard = (bg: string, children?: React.ReactNode) => (
  <span style={{ width: 120, height: 150, borderRadius: 24, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
);

/** The drawing and title shown on a game's card in the game list. */
export function GameArt({ id }: { id: Game['id'] }) {
  if (id === 'quiz') {
    return (
      <>
        <span style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          {num('#EBB7BC', 150, 1)}
          {num('#A9C6DE', 190, 2)}
          {num('#EED79A', 150, 3, '#8A6A2A')}
        </span>
        <span aria-hidden="true" style={{ width: 110, height: 110 }} />
        <span style={{ fontSize: 64, fontWeight: 600, color: '#B8737B', lineHeight: 1 }}>Quiz</span>
      </>
    );
  }
  if (id === 'memory') {
    return (
      <>
        <span aria-hidden="true" style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          {miniCard('#A9C6DE')}
          {miniCard('#F8DCDF',
            <svg width="80" height="80" viewBox="0 0 80 80">
              <g fill="#fff">
                {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="40" cy="23" rx="9" ry="13" transform={`rotate(${a} 40 40)`} />)}
              </g>
              <circle cx="40" cy="40" r="7" fill="#EED79A" />
            </svg>,
          )}
          {miniCard('#EED79A')}
        </span>
        <span style={{ fontSize: 64, fontWeight: 600, color: '#B8737B', lineHeight: 1, textAlign: 'center' }}>Memory Match</span>
      </>
    );
  }
  return (
    <>
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
    </>
  );
}
