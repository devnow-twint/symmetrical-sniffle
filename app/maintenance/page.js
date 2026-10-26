'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/lib/useProfile';

export default function MaintenancePage() {
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [msg, setMsg] = useState('Server DuniaNokos sedang dalam peningkatan dan optimalisasi jaringan demi kenyamanan dan kecepatan transaksi Anda.');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState('');
  const [lastCheck, setLastCheck] = useState('Baru saja');

  useEffect(() => {
    // Jika admin login membuka halaman ini, arahkan ke dashboard admin
    if (ready && profile?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/maintenance?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        });
        const json = await res.json();
        if (json.success) {
          if (!json.maintenance) {
            // Maintenance sudah selesai
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('dunia_maintenance');
            }
            router.push('/dashboard');
          } else if (json.message) {
            setMsg(json.message);
          }
        }
      } catch {}
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, [ready, profile, router]);

  const handleManualCheck = async () => {
    if (checking) return;
    setChecking(true);
    setCheckResult('');
    try {
      const res = await fetch(`/api/maintenance?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      const json = await res.json();
      setLastCheck(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (json.success && !json.maintenance) {
        setCheckResult('✅ Pemeliharaan telah selesai! Mengalihkan ke dashboard...');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('dunia_maintenance');
        }
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        setCheckResult('⚙️ Sistem masih dalam proses optimalisasi. Mohon tunggu sejenak.');
        setTimeout(() => setCheckResult(''), 4000);
      }
    } catch {
      setCheckResult('Gagal menghubungi server. Silakan coba lagi.');
      setTimeout(() => setCheckResult(''), 3000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 10%, #0d1527 0%, #060911 60%, #030508 100%)',
      padding: '32px 16px',
      fontFamily: 'var(--font, system-ui, -apple-system, sans-serif)',
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative Aurora Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 200, 150, 0.16) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      {/* Main Container Card with Glassmorphism */}
      <div style={{
        maxWidth: 620,
        width: '100%',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(0, 200, 150, 0.5)',
        borderRadius: 24,
        padding: '48px 36px',
        textAlign: 'center',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 200, 150, 0.08)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #00c896 0%, #008f6b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 800, color: '#000',
            boxShadow: '0 4px 14px rgba(0, 200, 150, 0.4)',
          }}>
            DN
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            Dunia<span style={{ color: '#00c896' }}>Nokos</span>
          </span>
        </div>

        {/* Live Status Pill with Pulsing Dot */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f59e0b',
              boxShadow: '0 0 10px #f59e0b',
              display: 'inline-block',
            }} />
            Mode Pemeliharaan Aktif
          </span>
        </div>

        {/* Hero Vector Graphic */}
        <div style={{
          margin: '0 auto 24px',
          width: 100, height: 100,
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(0, 200, 150, 0.1) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.15), 0 12px 30px rgba(0,0,0,0.4)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>

        {/* Headings */}
        <h1 style={{
          fontSize: '1.85rem',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 12,
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
        }}>
          Sistem Sedang Ditingkatkan
        </h1>

        <p style={{
          fontSize: '0.94rem',
          color: '#94a3b8',
          lineHeight: 1.7,
          maxWidth: 480,
          margin: '0 auto 28px',
        }}>
          {msg}
        </p>

        {/* Transparency Status Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 28,
          textAlign: 'left',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🔒</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Saldo & Akun</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#00c896' }}>100% Aman</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>⚡</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aktivitas Server</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>Optimalisasi</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🔄</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Auto Sync</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>Aktif (Otomatis)</div>
          </div>
        </div>

        {/* Live Manual Check Button */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={handleManualCheck}
            disabled={checking}
            style={{
              padding: '10px 22px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: checking ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
          >
            {checking ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderColor: '#fff', borderTopColor: 'transparent' }} />
                <span>Memeriksa server...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Cek Status Sekarang (Terakhir: {lastCheck})</span>
              </>
            )}
          </button>

          {checkResult && (
            <div style={{ marginTop: 10, fontSize: '0.82rem', color: checkResult.includes('✅') ? '#00c896' : '#fbbf24', fontWeight: 500 }}>
              {checkResult}
            </div>
          )}
        </div>

        {/* Action Button: WhatsApp Customer Service */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <a
            href="https://wa.me/62895325852528"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #00c896 0%, #009e76 100%)',
              color: '#08131d',
              padding: '14px 24px',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(0, 200, 150, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 200, 150, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 200, 150, 0.35)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Butuh Bantuan? Hubungi WhatsApp Admin</span>
          </a>

          {/* Admin Login Portal Link */}
          <Link
            href="/login"
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              textDecoration: 'none',
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#00c896'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
          >
            <span>🔐</span>
            <span>Khusus Pengelola / Admin? Masuk di sini</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
