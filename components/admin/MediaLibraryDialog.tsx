'use client';

import { useEffect, useState } from 'react';
import { mediaUrl } from '@/lib/media';
import { listLibrary } from '@/lib/media/library';
import { useSoundPreview } from './useSoundPreview';

const btn = {
  border: '1.5px solid #E3D5C4',
  background: '#fff',
  borderRadius: 12,
  color: '#4A3830',
  fontWeight: 700,
  fontFamily: 'Nunito, sans-serif',
  fontSize: 14,
  cursor: 'pointer',
  padding: 8,
} as const;

const fileName = (path: string): string => path.split('/').pop() ?? path;

/** "Choose from library" modal (A23): picks a picture or sound already used in the media bucket. */
export function MediaLibraryDialog({ kind, onChoose, onClose }: { kind: 'image' | 'audio'; onChoose: (path: string) => void; onClose: () => void }) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const preview = useSoundPreview();

  useEffect(() => {
    let live = true;
    listLibrary(kind).then(
      (p) => { if (live) setPaths(p); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [kind]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);


  // Choosing or closing (Close, Escape) also stops the preview: the hook stops on unmount.
  function pick(path: string) {
    preview.stop();
    onChoose(path);
    onClose();
  }

  let body: React.ReactNode;
  if (failed) body = <p role="alert" style={{ margin: 0, color: '#A8484F' }}>Could not load the library.</p>;
  else if (paths === null) body = <p style={{ margin: 0, color: '#6E5A4E' }}>Loading...</p>;
  else if (paths.length === 0) body = <p style={{ margin: 0, color: '#6E5A4E' }}>Nothing in the library yet.</p>;
  else body = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
      {paths.map((p) => {
        const name = fileName(p);
        const url = mediaUrl(p);
        if (kind === 'image') {
          return (
            <li key={p}>
              <button type="button" aria-label={`Choose ${name}`} onClick={() => pick(p)} style={{ ...btn, width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {url && <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
              </button>
            </li>
          );
        }
        const playing = preview.isPlaying(p);
        return (
          <li key={p} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" aria-label={`Choose ${name}`} onClick={() => pick(p)} style={{ ...btn, height: 56, wordBreak: 'break-all' }}>{name}</button>
            <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} ${name}`} onClick={() => preview.toggle(p, url)} style={{ ...btn, height: 40 }}>{playing ? 'Pause' : 'Play'}</button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(74,56,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', zIndex: 50 }}>
      <div role="dialog" aria-modal="true" aria-label="Choose from library" style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 640, width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(74,56,48,0.3)', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Nunito, sans-serif', color: '#4A3830' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Choose from library</h2>
          <button type="button" autoFocus onClick={onClose} style={{ ...btn, height: 44, padding: '0 20px' }}>Close</button>
        </div>
        {body}
      </div>
    </div>
  );
}
