'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Wrong email or password.');
      setBusy(false);
      return;
    }

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      await supabase.auth.signOut();
      setError('This account is not an admin.');
      setBusy(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 380, margin: '96px auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: '0 0 24px' }}>Admin sign-in</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ height: 46, padding: '0 14px', borderRadius: 12, border: '1.5px solid #E3D5C4', font: 'inherit' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ height: 46, padding: '0 14px', borderRadius: 12, border: '1.5px solid #E3D5C4', font: 'inherit' }}
          />
        </label>
        {error && (
          <p role="alert" style={{ margin: 0, color: '#A8484F', fontWeight: 700 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          style={{ height: 46, borderRadius: 12, border: 'none', background: '#5A4038', color: '#FFFFFF', fontWeight: 700, font: 'inherit', cursor: 'pointer' }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
