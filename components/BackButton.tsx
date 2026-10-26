'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Round back button; Esc / Back key also goes back (C8). */
export function BackButton({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') router.push(href);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [href, router]);
  return (
    <Link href={href} aria-label="Back" style={{ width: 104, height: 104, borderRadius: 52, background: '#fff', boxShadow: '0 6px 0 #EADCC8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#7A5C50" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
    </Link>
  );
}
