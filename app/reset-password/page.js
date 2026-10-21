'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: jika user datang dari link email Supabase (#access_token atau ?code)
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [modeManual, setModeManual] = useState(false);

  const [form, setForm] = useState({
    email: '',
    otp: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Tangkap parameter dari searchParams jika ada
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code') || searchParams.get('token');

    if (emailParam || codeParam) {
      setForm((prev) => ({
        ...prev,
        email: emailParam ? decodeURIComponent(emailParam) : prev.email,
        otp: codeParam ? decodeURIComponent(codeParam) : prev.otp,
      }));
    }

    // 2. Parse access_token dari window.location.hash jika ada (format link pemulihan Supabase)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && (type === 'recovery' || !type)) {
        setHasRecoverySession(true);
        if (refreshToken) {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .catch(() => {});
        }
      }
    }

    // 3. Listener sesi Supabase (event PASSWORD_RECOVERY atau SIGNED_IN)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasRecoverySession(true);
      }
    });

    // 4. Cek sesi yang sudah aktif
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasRecoverySession(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      // Jika terdeteksi link recovery / sesi Supabase aktif
      if (hasRecoverySession && !modeManual) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: form.password,
        });

        if (updateErr) {
          // Jika update user gagal, tawarkan opsi input manual
          setError('Tautan pemulihan mungkin sudah kedaluwarsa. Silakan masukkan kode atau kirim ulang email.');
          setModeManual(true);
          return;
        }

        await supabase.auth.signOut().catch(() => {});
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?reset=1');
        }, 1800);
      } else {
        // Mode Manual: verifikasi OTP & update melalui API backend
        if (!form.email || !form.otp) {
          setError('Email dan kode verifikasi wajib diisi.');
          return;
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            otp: form.otp.trim(),
            password: form.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Gagal mereset kata sandi.');
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/login?reset=1');
        }, 1800);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const isLinkRecovery = hasRecoverySession && !modeManual;

  return (
    <div className="auth-box">
      <div className="auth-logo">
        <h1>DuniaNokos</h1>
        <p>Atur Kata Sandi Baru</p>
      </div>

      {isLinkRecovery && (
        <div
          className="alert alert-info"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: '10px',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>✓</span>
          <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.5 }}>
            Tautan email terverifikasi! Masukkan kata sandi baru untuk akun kamu di bawah ini.
          </div>
        </div>
      )}

      {error && (
        <div
          className="alert alert-error"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: '10px',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>⚠</span>
          <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</div>
        </div>
      )}

      {info && (
        <div
          className="alert alert-info"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: '10px',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>ℹ</span>
          <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.5 }}>{info}</div>
        </div>
      )}

      {success ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div
            className="alert alert-success"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
              padding: '16px',
              borderRadius: '10px',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>✓</span>
            <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, textAlign: 'left' }}>
              Kata sandi berhasil diperbarui! Mengalihkan ke halaman masuk...
            </div>
          </div>
          <Link href="/login" className="btn btn-primary btn-full" style={{ textDecoration: 'none' }}>
            Masuk Sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Tampilkan field Email dan Kode jika tidak melalui link recovery otomatis atau memilih mode manual */}
          {!isLinkRecovery && (
            <>
              <div className="form-group">
                <label className="form-label">Email Terdaftar</label>
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
                <label className="form-label">Kode Verifikasi (OTP) / Token</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Masukkan kode OTP atau token dari email"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  style={{ letterSpacing: '1px' }}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input
              className="form-input"
              type="password"
              placeholder="Ulangi password baru"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }}></span> Menyimpan...
              </>
            ) : (
              'Simpan Password Baru'
            )}
          </button>
        </form>
      )}

      <div className="auth-footer" style={{ marginTop: 20 }}>
        {hasRecoverySession && !modeManual ? (
          <button
            type="button"
            onClick={() => setModeManual(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'block',
              margin: '0 auto 12px',
            }}
          >
            Punya kode manual? Klik di sini
          </button>
        ) : null}
        Batal reset kata sandi? <Link href="/login">Kembali ke Login</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <div className="auth-page">
        <Suspense fallback={<div className="auth-box" style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
