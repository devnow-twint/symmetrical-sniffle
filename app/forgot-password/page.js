'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Masukkan alamat email kamu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mengirim email reset password.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-logo">
            <h1>DuniaNokos</h1>
            <p>Pemulihan Kata Sandi</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '1rem', lineHeight: 1.2 }}>⚠</span>
              <div style={{ flex: 1, lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          {success ? (
            <div>
              <div
                className="alert alert-success"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '16px',
                  borderRadius: '10px',
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>✓</span>
                <div style={{ flex: 1, lineHeight: 1.6, fontSize: '0.875rem' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>Tautan reset password berhasil dikirim!</p>
                  <p style={{ margin: '6px 0 0', opacity: 0.9 }}>
                    Kami telah mengirim email ke <strong>{email}</strong>. Silakan cek kotak masuk atau folder spam kamu, lalu klik tautan di dalamnya untuk membuat kata sandi baru.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="btn btn-primary btn-full"
                  style={{ textAlign: 'center', textDecoration: 'none' }}
                >
                  Buka Halaman Reset Password →
                </Link>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  {loading ? 'Mengirim ulang...' : 'Belum menerima email? Kirim ulang'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
                Masukkan alamat email yang terdaftar pada akun DuniaNokos kamu. Kami akan mengirimkan tautan pemulihan kata sandi.
              </p>

              <div className="form-group">
                <label className="form-label">Email Terdaftar</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="email@kamu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }}></span> Mengirim Email...
                  </>
                ) : (
                  'Kirim Email Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer" style={{ marginTop: 24 }}>
            Ingat password akun kamu? <Link href="/login">Masuk sekarang</Link>
          </div>
        </div>
      </div>
    </>
  );
}
