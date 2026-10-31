'use client';

import { useState } from 'react';
import Link from 'next/link';
import { checkDifferences } from '@/lib/spot/validate';
import type { ELevel } from '@/lib/spot/adminLevels';
import { mediaUrl } from '@/lib/media';
import s from './admin-ui.module.css';
import { LibraryButton } from './LibraryButton';
import { PicIcon, dangerBtn, fileName, ghostBtn, panel } from './editor-parts';
import { SpotMarkerEditor } from './SpotMarkerEditor';

/** Accepted level pictures (A14). */
export const SPOT_IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

const small = { ...ghostBtn, height: 34, padding: '0 12px', fontSize: 13 } as const;
const hint = { fontSize: 12, color: '#7A6458' } as const;

type Side = 'a' | 'b';

function PicturePicker({ side, n, path, onLibrary, onSvg }: { side: Side; n: number; path: string | null; onLibrary: (path: string) => void; onSvg: (code: string) => void }) {
  const [svg, setSvg] = useState('');
  const label = side === 'a' ? 'A' : 'B';
  const url = mediaUrl(path);
  return (
    <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Picture {label}</span>
      <div style={{ height: 110, borderRadius: 14, background: '#FBF4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8968A', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={`Level ${n} picture ${label} thumbnail`} draggable={false} style={{ maxWidth: '100%', maxHeight: 110, objectFit: 'contain' }} /> : <PicIcon size={30} />}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <LibraryButton kind="image" label={`level ${n} picture ${label}`} onChoose={onLibrary} />
        {path && <span style={{ ...hint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{fileName(path)}</span>}
      </div>
      <details>
        <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Or paste SVG code</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <textarea className={s.in} aria-label={`SVG code for picture ${label} of level ${n}`} rows={3} value={svg} onChange={(e) => setSvg(e.target.value)} placeholder="<svg …>…</svg>"
            style={{ border: '1.5px solid #E3D5C4', borderRadius: 12, padding: 8, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', background: '#FFFDF9', color: '#4A3830' }} />
          <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Use SVG for picture ${label} of level ${n}`} style={{ ...small, alignSelf: 'flex-start' }} disabled={!svg.trim()} onClick={() => { onSvg(svg); setSvg(''); }}>Use this drawing</button>
        </div>
      </details>
    </div>
  );
}

/** One level: both pictures, the spots, on/off, order, preview and delete. Edits go up through `onEdit`. */
export function SpotLevelPanel({ l, n, count, message, shapeWarning, tallWarning, onEdit, onChooseLibrary, onSvg, onMove, onAskDelete }: {
  l: ELevel; n: number; count: number; message: string | null; shapeWarning: boolean; tallWarning: boolean;
  onEdit: (patch: Partial<ELevel>) => void; onChooseLibrary: (side: Side, path: string) => void; onSvg: (side: Side, code: string) => void;
  onMove: (dir: -1 | 1) => void; onAskDelete: () => void;
}) {
  const problem = checkDifferences(l.differences);
  const missing = !l.a || !l.b ? 'two pictures' : problem ? 'at least 3 spots (up to 10)' : '';
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
            <Link href={`/games/spot/${l.id}`} target="_blank" rel="noopener" className={`${s.btn} ${s.ghost}`} style={{ ...small, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Preview as child</Link>
          )}
          <button type="button" className={`${s.btn} ${s.danger}`} aria-label={`Delete level ${n}`} onClick={onAskDelete} style={{ ...dangerBtn, height: 34 }}>Delete</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PicturePicker side="a" n={n} path={l.a} onLibrary={(p) => onChooseLibrary('a', p)} onSvg={(c) => onSvg('a', c)} />
        <PicturePicker side="b" n={n} path={l.b} onLibrary={(p) => onChooseLibrary('b', p)} onSvg={(c) => onSvg('b', c)} />
      </div>

      <span style={hint}>Tip: use landscape pictures (4:3 or 3:2) and make every difference big and clear, so a young child can see it from the chair.</span>

      {tallWarning && <span role="status" style={{ fontSize: 13, fontWeight: 700, color: '#7A5410' }}>This picture is tall, so it will be shown smaller. A landscape picture (4:3 or 3:2) works best.</span>}

      {shapeWarning && <span role="status" style={{ fontSize: 13, fontWeight: 700, color: '#7A5410' }}>The two pictures have different shapes. The spots may not line up on picture B, so use pictures of the same size.</span>}

      <SpotMarkerEditor srcA={mediaUrl(l.a)} srcB={mediaUrl(l.b)} differences={l.differences} onChange={(differences) => onEdit({ differences })} />

      {message && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#A8484F' }}>{message}</span>}
      {missing && <span style={{ fontSize: 13, color: '#7A5410' }}>Needs {missing} before you can save.</span>}
    </article>
  );
}
