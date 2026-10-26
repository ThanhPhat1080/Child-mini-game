import Link from 'next/link';

export default function AdminHome() {
  return (
    <main style={{ maxWidth: 680, margin: '48px auto', padding: 24, display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Admin</h1>
      <Link href="/admin/settings" style={{ fontWeight: 700 }}>Settings</Link>
      <p style={{ margin: 0 }}>Quiz sets arrive in T4-T6.</p>
    </main>
  );
}
