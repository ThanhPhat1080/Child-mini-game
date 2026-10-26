'use client';

import { useState } from 'react';
import { isMusicMuted, setMusicMuted } from '@/lib/audio';
import styles from './MusicToggle.module.css';

/** Round music on/off button, top right of every child screen. */
export function MusicToggle() {
  const [on, setOn] = useState(!isMusicMuted());

  function toggle() {
    setMusicMuted(on);
    setOn(!on);
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${on ? styles.on : styles.off}`}
      aria-label={on ? 'Turn background music off' : 'Turn background music on'}
      onClick={toggle}
    >
      <svg aria-hidden="true" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={on ? '#7A5C50' : '#A8968A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
