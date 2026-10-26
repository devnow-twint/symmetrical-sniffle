'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';
import MaintenancePage from '@/app/maintenance/page';

// Route yang tidak pernah diblokir oleh maintenance mode
const EXEMPT_PREFIXES = ['/maintenance', '/login', '/admin'];

export default function MaintenanceGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, ready } = useProfile();
  
  // Baca state awal dari sessionStorage jika ada, agar redirect secepat kilat (0 flash)
  const [isMaintenance, setIsMaintenance] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dunia_maintenance') === '1';
    }
    return false;
  });
  const [checked, setChecked] = useState(false);

  const isExempt = EXEMPT_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  const isAdmin = ready && profile?.role === 'admin';

  useEffect(() => {
    let isMounted = true;

    const checkMaintenance = async () => {
      // 1. Jika user sudah login dan role-nya 'admin', jangan blokir sama sekali
      if (ready && profile?.role === 'admin') {
        if (isMounted) setChecked(true);
        return;
      }

      try {
        // Panggil endpoint dynamic tanpa cache dengan timestamp unik
        const res = await fetch(`/api/maintenance?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        });
        const data = await res.json();
        const active = data?.maintenance === true;

        if (isMounted) {
          setIsMaintenance(active);
          setChecked(true);

          if (active) {
            sessionStorage.setItem('dunia_maintenance', '1');
            // Jika maintenance aktif dan bukan di rute yang dikecualikan serta bukan admin -> redirect
            if (!isExempt && (!ready || profile?.role !== 'admin')) {
              router.replace('/maintenance');
            }
          } else {
            sessionStorage.removeItem('dunia_maintenance');
            // Jika maintenance sudah dimatikan dan user sedang berada di /maintenance -> kembalikan ke dashboard
            if (pathname === '/maintenance') {
              router.replace('/dashboard');
            }
          }
        }
      } catch (err) {
        if (isMounted) setChecked(true);
      }
    };

    checkMaintenance();

    // Polling setiap 15 detik agar saat maintenance dinyalakan/dimatikan, semua tab user langsung bereaksi
    const interval = setInterval(checkMaintenance, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname, profile, ready, router, isExempt]);

  // Jika di halaman /maintenance, biarkan halaman /maintenance me-render
  if (pathname === '/maintenance') {
    return <>{children}</>;
  }

  // Jika admin, izinkan akses penuh ke mana saja
  if (isAdmin) {
    return <>{children}</>;
  }

  // Jika rute exempt (/login, /admin), izinkan lewat
  if (isExempt) {
    return <>{children}</>;
  }

  // JIKA MAINTENANCE AKTIF dan BUKAN ADMIN:
  // Render langsung MaintenancePage di sini! JADI TIDAK AKAN PERNAH BOCOR/TEMBUS KONTEN APAPUN!
  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
