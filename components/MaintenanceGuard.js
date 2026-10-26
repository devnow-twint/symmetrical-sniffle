'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';

// Route yang tidak pernah diblokir oleh maintenance mode
const EXEMPT_PREFIXES = ['/maintenance', '/login', '/admin'];

export default function MaintenanceGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [checking, setChecking] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkMaintenance = async () => {
      // 1. Jika rute saat ini ada dalam daftar pengecualian (/login, /admin, /maintenance), lewati
      const isExempt = EXEMPT_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
      
      // 2. Jika user sudah login dan rolenya adalah 'admin', bypass maintenance mode sepenuhnya!
      if (ready && profile?.role === 'admin') {
        if (isMounted) setChecking(false);
        return;
      }

      // 3. Ambil status maintenance
      try {
        const res = await fetch('/api/maintenance');
        const data = await res.json();
        const active = data?.maintenance === true;

        if (isMounted) {
          setIsMaintenance(active);

          // Jika maintenance aktif dan bukan di rute pengecualian serta bukan admin -> redirect ke /maintenance
          if (active && !isExempt && (!ready || profile?.role !== 'admin')) {
            router.replace('/maintenance');
          }
        }
      } catch {
        // Jika fetch gagal, izinkan lewat agar tidak blank
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    checkMaintenance();

    return () => { isMounted = false; };
  }, [pathname, profile, ready, router]);

  // Jika sedang di halaman /maintenance, biarkan halaman /maintenance me-render sendiri
  if (pathname === '/maintenance') {
    return <>{children}</>;
  }

  // Jika bukan admin dan terdeteksi maintenance aktif di halaman yang diproteksi, tampilkan spinner selagi redirect
  if (isMaintenance && profile?.role !== 'admin' && !EXEMPT_PREFIXES.some(p => pathname.startsWith(p))) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-0)',
        color: 'var(--text-3)',
        fontSize: '0.9rem',
        gap: 12,
      }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
        <span>Memeriksa status sistem...</span>
      </div>
    );
  }

  return <>{children}</>;
}
