'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setNotice('Registrasi berhasil! Silakan masuk ke akun kamu.');
    } else if (searchParams.get('reset') === '1') {
      setNotice('Password berhasil diperbarui! Silakan masuk dengan kata sandi baru.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login gagal');
        return;
      }

      const sessionData = JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user_id: data.user.id,
        email: data.user.email,
        profile: data.user.profile,
      });

      // "Ingat Saya" → localStorage (persisten); tidak dicentang → sessionStorage (hilang saat tab ditutup)
      if (rememberMe) {
        localStorage.setItem('dn_session', sessionData);
        sessionStorage.removeItem('dn_session');
      } else {
        sessionStorage.setItem('dn_session', sessionData);
        localStorage.removeItem('dn_session');
      }

      if (data.user.profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <div className="auth-logo">
        <h1>DuniaNokos</h1>
        <p>Masuk ke akun kamu</p>
      </div>

      {notice && <div className="alert alert-success">✓ {notice}</div>}
      {error && <div className="alert alert-error">⚠ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="email@kamu.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <label
              htmlFor="rememberMe"
              style={{ fontSize: '0.85rem', color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}
            >
              Ingat saya
            </label>
          </div>

          <Link
            href="/forgot-password"
            style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            Lupa password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16 }}></span> Masuk...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      <div className="auth-footer">
        Belum punya akun? <Link href="/register">Daftar sekarang</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="auth-page">
        <Suspense fallback={<div className="auth-box"><div className="spinner" style={{ margin: '40px auto' }}></div></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
