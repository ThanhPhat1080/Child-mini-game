'use client';

import { useState } from 'react';
import Link from 'next/link';
import { setObjectAudio, type ELevel } from '@/lib/find/adminLevels';
import { checkObjects } from '@/lib/find/validate';
import { mediaUrl } from '@/lib/media';
import s from './admin-ui.module.css';
import { FindMarkerEditor } from './FindMarkerEditor';
import { MediaLibraryDialog } from './MediaLibraryDialog';
import { PicIcon, dangerBtn, fileName, ghostBtn, panel } from './editor-parts';

/** Accepted level pictures (A21), the same types as the Spot and Cards pictures. */
export const FIND_IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

const small = { ...ghostBtn, height: 34, padding: '0 12px', fontSize: 13 } as const;
const hint = { fontSize: 12, color: '#7A6458' } as const;

function PicturePicker({ n, path, onPick, onSvg, onLibrary }: { n: number; path: string | null; onPick: (f: File) => void; onSvg: (code: string) => void; onLibrary: () => void }) {
  const [svg, setSvg] = useState('');
  const id = `find-pic-${n}`;
  const url = mediaUrl(path);
  return (
    <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Picture</span>
      <div style={{ height: 130, borderRadius: 14, background: '#FBF4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8968A', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={`Level ${n} picture`} draggable={false} style={{ maxWidth: '100%', maxHeight: 130, objectFit: 'contain' }} /> : <PicIcon size={30} />}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input id={id} type="file" hidden aria-label={`Picture file for level ${n}`} accept={FIND_IMG_TYPES.join(',')}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
        <button type="button" className={`${s.btn} ${s.ghost}`} style={small} onClick={() => document.getElementById(id)?.click()}>{path ? 'Change picture' : 'Upload picture'}</button>
        <button type="button" className={`${s.btn} ${s.ghost}`} style={small} onClick={onLibrary}>Choose from library</button>
        {path && <span style={{ ...hint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{fileName(path)}</span>}
      </div>
      <details>
        <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Or paste SVG code</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <textarea className={s.in} aria-label={`SVG code for level ${n}`} rows={3} value={svg} onChange={(e) => setSvg(e.target.value)} placeholder="<svg …>…</svg>"
            style={{ border: '1.5px solid #E3D5C4', borderRadius: 12, padding: 8, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', background: '#FFFDF9', color: '#4A3830' }} />
          <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Use SVG for level ${n}`} style={{ ...small, alignSelf: 'flex-start' }} disabled={!svg.trim()} onClick={() => { onSvg(svg); setSvg(''); }}>Use this drawing</button>
        </div>
      </details>
    </div>
  );
}

/** One level: its picture, the objects, on/off, order, preview and delete. Edits go up through `onEdit`. */
export function FindLevelPanel({ l, n, count, message, onEdit, onPickPicture, onSvg, onPickSound, onMove, onAskDelete }: {
  l: ELevel; n: number; count: number; message: string | null;
  onEdit: (patch: Partial<ELevel>) => void;
  onPickPicture: (f: File) => void; onSvg: (code: string) => void;
  onPickSound: (i: number, f: File) => void;
  onMove: (dir: -1 | 1) => void; onAskDelete: () => void;
}) {
  // which library dialog is open: the picture (true) or the sound of one object (its index)
  const [library, setLibrary] = useState<'picture' | number | null>(null);
  const missing = !l.image ? 'a picture' : checkObjects(l.objects) ? '2 to 12 objects, each with a word' : '';

  return (
    <article aria-label={`Level ${n}`} style={{ ...panel, padding: 18, gap: 14, opacity: l.active ? 1 : 0.8, border: missing ? '1.5px dashed #E5C979' : '1.5px solid transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Level {n}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" role="switch" aria-label={`Level ${n} on`} checked={l.active} onChange={() => onEdit({ active: !l.active })} style={{ width: 18, height: 18, margin: 0, accentColor: '#3F6B48' }} />
            {l.active ? 'On' : 'Off (draft)'}
          </label>
          <button type="button" className={`${s.btn} ${s.ghost}`} style={small} aria-label={`Move level ${n} up`} disabled={n === 1} onClick={() => onMove(-1)}>↑</button>
          <button type="button" className={`${s.btn} ${s.ghost}`} style={small} aria-label={`Move level ${n} down`} disabled={n === count} onClick={() => onMove(1)}>↓</button>
          {!l.isNew && (
            <Link href={`/games/find/${l.id}`} target="_blank" rel="noopener" className={`${s.btn} ${s.ghost}`} style={{ ...small, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Preview as child</Link>
          )}
          <button type="button" className={`${s.btn} ${s.danger}`} aria-label={`Delete level ${n}`} onClick={onAskDelete} style={{ ...dangerBtn, height: 34 }}>Delete</button>
        </div>
      </div>

      <PicturePicker
        n={n} path={l.image}
        onPick={onPickPicture} onSvg={onSvg}
        onLibrary={() => setLibrary('picture')}
      />

      <span style={hint}>Tip: use a clear picture where every object is big enough to click.</span>

      <FindMarkerEditor
        src={mediaUrl(l.image)} objects={l.objects}
        onChange={(objects) => onEdit({ objects })}
        onPickSound={onPickSound}
        onLibrarySound={(i) => setLibrary(i)}
      />

      {library !== null && (
        <MediaLibraryDialog
          kind={library === 'picture' ? 'image' : 'audio'}
          onClose={() => setLibrary(null)}
          onUploadFile={(f) => { if (library === 'picture') onPickPicture(f); else onPickSound(library, f); }}
          onChoose={(path) => {
            if (library === 'picture') onEdit({ image: path });
            else onEdit({ objects: setObjectAudio(l.objects, library, path) });
          }}
        />
      )}

      {message && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#A8484F' }}>{message}</span>}
      {missing && <span style={{ fontSize: 13, color: '#7A5410' }}>Needs {missing} before you can save.</span>}
    </article>
  );
}
