'use client';

import { useId, useState } from 'react';
import { addObject, moveObject, removeObject, setObjectAudio, setObjectRadius, setObjectWord, type EObject } from '@/lib/find/adminLevels';
import { MAX_OBJECTS, MAX_WORD, SMALL_R } from '@/lib/find/validate';
import { mediaUrl } from '@/lib/media';
import { AUDIO_ACCEPT } from './CardPanel';
import { useSoundPreview } from './useSoundPreview';
import s from './admin-ui.module.css';
import { PicIcon, dangerBtn, fileName, ghostBtn, inputStyle } from './editor-parts';

const EDGE = 0.01;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const small = { ...ghostBtn, height: 34, padding: '0 12px', fontSize: 13 } as const;

type Props = {
  src: string | null;
  objects: EObject[];
  onChange: (next: EObject[]) => void;
  onPickSound: (i: number, f: File) => void;
  onLibrarySound: (i: number) => void;
};

/** Places and names the objects of one level (A21). Click the picture to add an object; the row list holds its word and sound. */
export function FindMarkerEditor({ src, objects, onChange, onPickSound, onLibrarySound }: Props) {
  const uid = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const preview = useSoundPreview();

  const sel = selected !== null && selected < objects.length ? selected : null;
  const smallCount = objects.filter((o) => o.r < SMALL_R).length;

  function place(e: React.MouseEvent) {
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect(); // measured now: the picture may have been resized
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    if (objects.length >= MAX_OBJECTS) { setNotice(`You can add at most ${MAX_OBJECTS} objects.`); return; }
    const x = round3(clamp((e.clientX - rect.left) / rect.width, EDGE, 1 - EDGE));
    const y = round3(clamp((e.clientY - rect.top) / rect.height, EDGE, 1 - EDGE));
    setNotice(null);
    onChange(addObject(objects, x, y));
    setSelected(objects.length);
  }

  function setRadius(pct: number) {
    if (sel === null || !Number.isFinite(pct)) return;
    onChange(setObjectRadius(objects, sel, round3(pct / 100)));
  }

  function remove() {
    if (sel === null) return;
    setNotice(null);
    onChange(removeObject(objects, sel));
    setSelected(null);
  }

  function move(i: number, dir: -1 | 1) {
    onChange(moveObject(objects, i, dir));
    setSelected(i + dir);
  }

  const radiusPct = sel === null ? 0 : Math.round(objects[sel].r * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#7A6458' }}>
        {src
          ? `Click the picture to add an object (${objects.length}/${MAX_OBJECTS}).`
          : 'Upload or choose a picture first.'}
      </span>

      {src ? (
        <div style={{ background: '#FBF4E9', borderRadius: 14, padding: 8, display: 'flex', justifyContent: 'center' }}>
          <div onClick={place} style={{ position: 'relative', width: '100%', maxWidth: 640, lineHeight: 0, cursor: 'crosshair' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={setImgEl} src={src} alt="Picture" draggable={false} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }} />
            {objects.map((o, i) => (
              <button
                key={i} type="button" aria-label={`Object ${i + 1}`} aria-pressed={sel === i}
                onClick={(e) => { e.stopPropagation(); setNotice(null); setSelected(i); }}
                style={{
                  position: 'absolute', left: `${o.x * 100}%`, top: `${o.y * 100}%`, width: `${o.r * 200}%`, aspectRatio: '1 / 1', transform: 'translate(-50%, -50%)',
                  boxSizing: 'border-box', borderRadius: '50%', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: sel === i ? '3px solid #3E6B8C' : '2.5px solid #fff', background: sel === i ? 'rgba(95,136,171,0.55)' : 'rgba(95,136,171,0.35)',
                  boxShadow: '0 0 0 1.5px #5F88AB', color: '#1F3A52', fontWeight: 700, fontSize: 13, fontFamily: 'Nunito, sans-serif', lineHeight: 1,
                }}
              >{i + 1}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ height: 160, borderRadius: 14, background: '#FBF4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8968A', gap: 8, fontSize: 14 }}>
          <PicIcon size={28} /> Add a picture first.
        </div>
      )}

      <span style={{ fontSize: 13, color: '#6E5A4E' }}>Tip: use a clear picture where every object is big enough to click.</span>

      {smallCount > 0 && (
        <span role="status" style={{ fontSize: 13, fontWeight: 700, color: '#7A5410' }}>
          {smallCount === 1 ? '1 object is small' : `${smallCount} objects are small`} and may be hard to click.
        </span>
      )}

      {notice && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#A8484F' }}>{notice}</span>}

      {sel !== null && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Object {sel + 1}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
            Size
            <input type="range" aria-label="Radius" min={3} max={15} step={1} value={radiusPct} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: 160, accentColor: '#3F6B48' }} />
            <span style={{ fontWeight: 400, color: '#7A6458', minWidth: 32 }}>{radiusPct}%</span>
          </label>
          <button type="button" className={`${s.btn} ${s.danger}`} style={{ ...dangerBtn, height: 36 }} onClick={remove}>Delete object</button>
        </div>
      )}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {objects.map((o, i) => {
          const n = i + 1;
          const on = sel === i;
          const fileId = `${uid}-snd-${i}`;
          return (
            <li
              key={i} aria-label={`Object ${n} row`} data-selected={on ? 'true' : 'false'}
              onFocus={() => setSelected(i)} onClick={() => setSelected(i)}
              style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: 10, borderRadius: 14, background: on ? '#EAF3FA' : '#FFFDF9', border: `1.5px solid ${on ? '#A9C6DE' : '#E3D5C4'}` }}
            >
              <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '2px solid #5F88AB', color: '#1F3A52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: '0 0 auto' }}>{n}</span>
              <input
                type="text" className={s.in} aria-label={`Word for object ${n}`} maxLength={MAX_WORD} value={o.word} placeholder="e.g. cat"
                onChange={(e) => onChange(setObjectWord(objects, i, e.target.value))}
                style={{ ...inputStyle, height: 40, flex: '1 1 160px', minWidth: 0, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#7A6458', minWidth: 70, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.audio_path ? fileName(o.audio_path) : 'No sound'}
                </span>
                <input id={fileId} type="file" hidden aria-label={`Sound file for object ${n}`} accept={AUDIO_ACCEPT}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPickSound(i, f); }} />
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Upload sound for object ${n}`} style={small} onClick={(e) => { e.stopPropagation(); document.getElementById(fileId)?.click(); }}>Upload sound</button>
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Choose sound for object ${n}`} style={small} onClick={(e) => { e.stopPropagation(); onLibrarySound(i); }}>Choose sound</button>
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`${preview.isPlaying(o.audio_path) ? 'Pause' : 'Play'} sound for object ${n}`} style={small} disabled={!o.audio_path} onClick={(e) => { e.stopPropagation(); if (o.audio_path) preview.toggle(o.audio_path, mediaUrl(o.audio_path)); }}>{preview.isPlaying(o.audio_path) ? 'Pause sound' : 'Play sound'}</button>
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Clear sound for object ${n}`} style={small} disabled={!o.audio_path}
                  onClick={(e) => { e.stopPropagation(); onChange(setObjectAudio(objects, i, null)); }}>Clear sound</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Move object ${n} up`} style={small} disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1); }}>↑</button>
                <button type="button" className={`${s.btn} ${s.ghost}`} aria-label={`Move object ${n} down`} style={small} disabled={i === objects.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1); }}>↓</button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
