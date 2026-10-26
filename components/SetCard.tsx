import { mediaUrl } from '@/lib/media';

export type SetCardData = { id: string; title: string; subtitle: string | null; heading_color: string; cover_path: string | null; count: number };

/** Quiz set card shared by the child screen and the admin preview (ADR-023). */
export function SetCard({ set, done }: { set: SetCardData; done?: boolean }) {
  const cover = mediaUrl(set.cover_path);
  return (
    <div style={{ position: 'relative', width: 520, height: 640, borderRadius: 56, background: '#fff', boxShadow: '0 14px 0 #EADCC8', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 400, background: '#F7ECCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 24px' }}>
        <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, color: set.heading_color }}>{set.title}</span>
        {set.subtitle && <span style={{ fontSize: 36, fontWeight: 500, color: '#8A6A5E' }}>{set.subtitle}</span>}
      </div>
      {done && (
        <svg aria-label="Finished" width="120" height="120" viewBox="0 0 24 24" fill="#EED79A" stroke="#C9A05A" strokeWidth="1" strokeLinejoin="round" style={{ position: 'absolute', top: 16, right: 16 }}>
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      )}
    </div>
  );
}
