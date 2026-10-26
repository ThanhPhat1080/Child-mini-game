import type { ReactNode } from 'react';
import { mediaUrl } from '@/lib/media';

export const IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'];

export const panel = { background: '#fff', borderRadius: 18, boxShadow: '0 1px 0 #EADCC8', display: 'flex', flexDirection: 'column' } as const;
export const inputStyle = { height: 46, border: '1.5px solid #E3D5C4', borderRadius: 12, padding: '0 14px', fontSize: 16, fontFamily: 'Nunito, sans-serif', background: '#FFFDF9', color: '#4A3830' } as const;
export const ghostBtn = { height: 38, padding: '0 14px', borderRadius: 10, border: '1.5px solid #E3D5C4', background: '#fff', color: '#4A3830', fontWeight: 700, fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer' } as const;
export const dangerBtn = { padding: '0 14px', borderRadius: 10, border: '1.5px solid #E3BFC2', background: '#fff', color: '#A8484F', fontWeight: 700, fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer' } as const;
export const fileName = (p: string | null) => (p ? p.split('/').pop() ?? p : '');

export function Img({ path, w, h }: { path: string; w: number | string; h: number | string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(path) ?? ''} alt="" draggable={false} style={{ width: w, height: h, objectFit: 'contain' }} />;
}

export function PicIcon({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function Eye() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FBF4E9', fontFamily: 'Nunito, sans-serif', color: '#4A3830', padding: '28px 32px 64px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>{children}</div>
    </div>
  );
}
