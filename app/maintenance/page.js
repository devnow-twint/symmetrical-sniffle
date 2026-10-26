'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/lib/useProfile';

export default function MaintenancePage() {
  const router = useRouter();
  const { profile, ready } = useProfile();

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
        if (json.success && !json.maintenance) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dunia_maintenance');
          }
          router.push('/dashboard');
        }
      } catch { }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, [ready, profile, router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      color: '#333',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '20px',
      textAlign: 'center',
      padding: '120px 20px',
      boxSizing: 'border-box',
    }}>
      <title>Site Maintenance</title>
      <article style={{
        display: 'block',
        textAlign: 'left',
        maxWidth: 650,
        width: '100%',
        margin: '0 auto',
        lineHeight: 1.6,
      }}>
        <h1 style={{
          fontSize: '50px',
          fontWeight: 700,
          margin: '0 0 20px',
          color: '#333',
          lineHeight: 1.2,
        }}>
          We&rsquo;ll be back soon!
        </h1>
        <div>
          <p style={{ margin: '0 0 20px' }}>
            Sorry for the inconvenience but we&rsquo;re performing some maintenance at the moment. If you need to you can always <a href="https://wa.me/naomikuniko" target="_blank" rel="noopener noreferrer" style={{ color: '#dc8100', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = '#333'} onMouseLeave={e => e.currentTarget.style.color = '#dc8100'}>contact us</a>, otherwise we&rsquo;ll be back online shortly!
          </p>
          <p style={{ margin: '0 0 20px' }}>&mdash; Dunia Nokos</p>
        </div>

        {/* Akses login admin */}
        {/* <div style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <Link
            href="/login"
            style={{
              fontSize: '13px',
              color: '#999',
              textDecoration: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#333'}
            onMouseLeave={e => e.currentTarget.style.color = '#999'}
          >
            Admin Login &rarr;
          </Link>
        </div> */}
      </article>
    </div>
  );
}
