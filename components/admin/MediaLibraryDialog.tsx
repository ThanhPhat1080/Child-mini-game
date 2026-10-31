'use client';

import { useEffect, useRef, useState } from 'react';
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

/** The highlight of the picked item (A24). */
const picked = { border: '3px solid #3F6B48', background: '#EAF3FA' } as const;

/**
 * "Choose from library" modal (A23, A24). Clicking an item only highlights it; OK (bottom right) applies it.
 * Applying is a preview: the page keeps it until Save, and Revert drops it. "Upload new" picks a file from the computer instead.
 */
export function MediaLibraryDialog({ kind, onChoose, onClose, onUploadFile }: {
  kind: 'image' | 'audio'; onChoose: (path: string) => void; onClose: () => void; onUploadFile?: (file: File) => void;
}) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useSoundPreview();
  const fileInput = useRef<HTMLInputElement | null>(null);

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

  // OK applies the highlighted file. The preview stops first; the dialog closes after.
  function ok() {
    if (!selected) return;
    preview.stop();
    onChoose(selected);
    onClose();
  }

  function uploaded(file: File | undefined) {
    if (!file || !onUploadFile) return;
    preview.stop();
    onUploadFile(file);
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
        const on = selected === p;
        if (kind === 'image') {
          return (
            <li key={p}>
              <button type="button" aria-label={`Choose ${name}`} aria-pressed={on} data-selected={on ? 'true' : 'false'} onClick={() => setSelected(p)}
                style={{ ...btn, width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...(on ? picked : {}) }}>
                {url && <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
              </button>
            </li>
          );
        }
        const playing = preview.isPlaying(p);
        return (
          <li key={p} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" aria-label={`Choose ${name}`} aria-pressed={on} data-selected={on ? 'true' : 'false'} onClick={() => setSelected(p)}
              style={{ ...btn, height: 56, wordBreak: 'break-all', ...(on ? picked : {}) }}>{name}</button>
            <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} ${name}`} onClick={() => preview.toggle(p, url)} style={{ ...btn, height: 40 }}>{playing ? 'Pause' : 'Play'}</button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(74,56,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', zIndex: 50 }}>
      <div role="dialog" aria-modal="true" aria-label="Choose from library" style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 640, width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(74,56,48,0.3)', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Nunito, sans-serif', color: '#4A3830' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Choose from library</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {onUploadFile && (
              <>
                <input ref={fileInput} type="file" hidden accept={kind === 'image' ? 'image/*' : 'audio/*'} aria-label={`Upload new ${kind === 'image' ? 'picture' : 'sound'}`}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploaded(f); }} />
                <button type="button" onClick={() => fileInput.current?.click()} style={{ ...btn, height: 44, padding: '0 16px' }}>Upload new</button>
              </>
            )}
            <button type="button" autoFocus onClick={onClose} style={{ ...btn, height: 44, padding: '0 20px' }}>Close</button>
          </div>
        </div>
        {body}
        {paths !== null && paths.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" aria-label="OK" onClick={ok} disabled={!selected}
              style={{ ...btn, height: 46, padding: '0 28px', background: selected ? '#3F6B48' : '#E3D5C4', borderColor: 'transparent', color: '#fff', opacity: selected ? 1 : 0.7, cursor: selected ? 'pointer' : 'default' }}>OK</button>
          </div>
        )}
      </div>
    </div>
  );
}
