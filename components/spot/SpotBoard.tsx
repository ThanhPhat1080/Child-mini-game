'use client';

import { useState } from 'react';
import type { SpotLevel } from '@/lib/spot/types';

export type SpotRipple = { side: 'a' | 'b'; x: number; y: number; key: number };

const MAX_W = 880;
const MAX_H = 700;
const GAP = 48;
const DEFAULT_ASPECT = 4 / 3;

type Props = {
  level: SpotLevel;
  urlA: string | null;
  urlB: string | null;
  found: readonly number[];
  onTap: (point: { x: number; y: number }, aspect: number) => void;
  ripple?: SpotRipple | null;
  reduced?: boolean;
  /** Called just before `onTap` with the picture that was tapped (the page needs it to place a ripple). */
  onSide?: (side: 'a' | 'b') => void;
};

/** Two equal pictures side by side. A tap on either is reported as fractions of that picture's rect read at tap time. */
export function SpotBoard({ level, urlA, urlB, found, onTap, ripple = null, reduced = false, onSide }: Props) {
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [broken, setBroken] = useState({ a: false, b: false });
  const w = Math.min(MAX_W, Math.floor(MAX_H * aspect));
  const h = Math.floor(w / aspect);

  const pic = (side: 'a' | 'b', url: string | null) => {
    const src = url && !broken[side] ? url : null;
    return (
      <div
        data-spot-pic={side}
        className="hm-spot-pic"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (!(r.width > 0) || !(r.height > 0)) return;
          onSide?.(side);
          onTap({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }, aspect);
        }}
        style={{ width: w, height: h, borderRadius: 40, background: '#fff', border: '8px solid #A9C6DE', boxShadow: '0 8px 0 #EADCC8', boxSizing: 'border-box' }}
      >
        <span style={{ position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden', display: 'block' }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={side === 'a' ? (e) => {
                const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget;
                if (nw > 0 && nh > 0) setAspect(nw / nh);
              } : undefined}
              onError={() => setBroken((b) => ({ ...b, [side]: true }))}
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }}
            />
          ) : (
            <svg data-placeholder aria-hidden="true" width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none" style={{ display: 'block' }}>
              <rect width="10" height="10" fill="#EFE6DA" />
            </svg>
          )}
        </span>
        {found.map((i) => {
          const d = level.differences[i];
          if (!d) return null;
          return (
            <span
              key={i}
              data-spot-found
              className={reduced ? 'hm-spot-ring' : 'hm-spot-ring hm-spot-grow'}
              style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${Math.max(d.r, 0.04) * 200}%`, aspectRatio: '1' }}
            />
          );
        })}
        {ripple && ripple.side === side && (
          <span key={ripple.key} data-spot-ripple className="hm-spot-ripple" style={{ left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%` }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start', justifyContent: 'center' }}>
      {pic('a', urlA)}
      {pic('b', urlB)}
    </div>
  );
}
