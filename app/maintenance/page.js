'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/lib/useProfile';

export default function MaintenancePage() {
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [msg, setMsg] = useState('Sistem sedang dalam pemeliharaan dan peningkatan server. Kami akan segera kembali!');

  useEffect(() => {
    // Jika admin yang login membuka halaman ini, langsung lempar ke admin dashboard
    if (ready && profile?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    // Ambil pesan maintenance
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/maintenance');
        const json = await res.json();
        if (json.success) {
          if (!json.maintenance) {
            // Maintenance sudah dimatikan, kembalikan ke dashboard/home
            router.push('/dashboard');
          } else if (json.message) {
            setMsg(json.message);
          }
        }
      } catch {}
    };

    fetchStatus();
    // Auto-check setiap 20 detik jika maintenance sudah selesai
    const timer = setInterval(fetchStatus, 20000);
    return () => clearInterval(timer);
  }, [ready, profile, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(0, 200, 150, 0.08) 0%, var(--bg-0) 70%)',
      padding: '24px 16px',
      fontFamily: 'var(--font)',
      color: 'var(--text-1)',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow element */}
        <div style={{
          position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          fontSize: '2.5rem',
          marginBottom: 24,
          animation: 'bounce 2s infinite',
        }}>
          🚧
        </div>

        <div style={{
          display: 'inline-block',
          background: 'rgba(234, 179, 8, 0.15)',
          color: '#eab308',
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '4px 14px',
          borderRadius: 20,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Mode Pemeliharaan
        </div>

        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          marginBottom: 12,
          lineHeight: 1.3,
          color: 'var(--text-1)',
        }}>
          Sistem Sedang Dalam Perbaikan
        </h1>

        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-2)',
          lineHeight: 1.7,
          marginBottom: 28,
        }}>
          {msg}
        </p>

        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px',
          fontSize: '0.82rem',
          color: 'var(--text-3)',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          ⏱️ Halaman ini akan otomatis menyegarkan diri setelah perbaikan sistem selesai. Saldo dan akun Anda tetap aman.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href="https://wa.me/62895325852528"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-full"
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>💬</span>
            <span>Hubungi Bantuan Admin via WhatsApp</span>
          </a>

          {/* Akses Login Khusus Admin */}
          <Link
            href="/login"
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-3)',
              textDecoration: 'none',
              marginTop: 8,
              transition: 'color 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <span>🔒</span>
            <span>Khusus Admin? Masuk di sini</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
