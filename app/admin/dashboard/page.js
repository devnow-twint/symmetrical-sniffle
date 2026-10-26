'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useProfile } from '@/lib/useProfile';

function StatCard({ icon, label, value, sub, color, loading }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${color}33`,
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ fontSize: '1.6rem' }}>{icon}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      {loading ? (
        <div style={{ height: 32, background: 'var(--bg-2)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <div style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--mono)' }}>{value}</div>
      )}
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ data, maxVal }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
      {data.map((d, i) => {
        const h = maxVal > 0 ? Math.max(4, (d.count / maxVal) * 60) : 4;
        const label = d.date?.slice(5); // MM-DD
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: h,
              background: `linear-gradient(180deg, var(--accent) 0%, var(--accent-glow) 100%)`,
              borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.3s ease' }} />
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', whiteSpace:'nowrap' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { session, profile, ready } = useProfile();
  const [stats, setStats] = useState(null);
  const [providerBalance, setProviderBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(true);
  const [depositToggling, setDepositToggling] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);
  const [rates, setRates] = useState({ usd_to_idr: 16000, otp_price_markup: 1.5 });
  const [ratesInput, setRatesInput] = useState({ usd_to_idr: '', otp_price_markup: '' });
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesMsg, setRatesMsg] = useState('');
  const [smtpInput, setSmtpInput] = useState({ smtp_gmail_user: '', smtp_gmail_pass: '' });
  const [smtpCount, setSmtpCount] = useState(0);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState('');
  const [blacklistedIds, setBlacklistedIds] = useState([]);
  const [blackInput, setBlackInput] = useState('');
  const [blackSaving, setBlackSaving] = useState(false);
  const [blackMsg, setBlackMsg] = useState('');
  const [inspectCountry, setInspectCountry] = useState('6');
  const [inspectService, setInspectService] = useState('wa');
  const [inspectList, setInspectList] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectMsg, setInspectMsg] = useState('');
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) { router.push('/login'); return; }
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
    loadAll(session.access_token);
  }, [ready, session, profile]);

  const loadAll = async (token) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [statsRes, balRes, settingsRes, ratesRes, smtpRes, blackRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/balance', { headers }),
        fetch('/api/admin/settings', { headers }),
        fetch('/api/admin/rates', { headers }),
        fetch('/api/admin/smtp-accounts', { headers }),
        fetch('/api/admin/blacklist', { headers }),
      ]);
      const sd  = await statsRes.json();
      const bd  = await balRes.json();
      const stg = await settingsRes.json();
      const rt  = await ratesRes.json();
      const smtp = await smtpRes.json();
      const bl  = await blackRes.json();
      if (sd.success)  setStats(sd.data);
      if (bd.success)  setProviderBalance(bd.data);
      if (stg.success) {
        setDepositOpen(stg.data?.deposit_open !== 'false');
        setMaintenanceMode(stg.data?.maintenance_mode === 'true');
        setSmtpInput({ smtp_gmail_user: '', smtp_gmail_pass: '' });
        if (stg.data?.smtp_gmail_user === '__SET__' || stg.data?.smtp_gmail_pass === '__SET__') {
          setSmtpMsg('✅ SMTP Gmail sudah tersimpan. Isi ulang hanya jika ingin mengganti.');
        }
      }
      if (rt.success)  {
        setRates(rt.data);
        setRatesInput({ usd_to_idr: String(rt.data.usd_to_idr), otp_price_markup: String(rt.data.otp_price_markup) });
      }
      if (smtp.success) setSmtpCount(smtp.data?.count || 0);
      if (bl.success && Array.isArray(bl.data)) setBlacklistedIds(bl.data);
    } catch {}
    setLoading(false);
  };

  const handleToggleDeposit = async () => {
    if (!session || depositToggling) return;
    setDepositToggling(true);
    try {
      const newVal = !depositOpen;
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ key: 'deposit_open', value: newVal }),
      });
      const d = await res.json();
      if (d.success) setDepositOpen(newVal);
    } catch {}
    setDepositToggling(false);
  };

  const handleToggleMaintenance = async () => {
    if (!session || maintenanceToggling) return;
    setMaintenanceToggling(true);
    try {
      const newVal = !maintenanceMode;
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ key: 'maintenance_mode', value: newVal ? 'true' : 'false' }),
      });
      const d = await res.json();
      if (d.success) setMaintenanceMode(newVal);
    } catch {}
    setMaintenanceToggling(false);
  };

  const handleSaveRates = async () => {
    if (!session || ratesSaving) return;
    setRatesSaving(true); setRatesMsg('');
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          usd_to_idr:       parseFloat(ratesInput.usd_to_idr),
          otp_price_markup: parseFloat(ratesInput.otp_price_markup),
        }),
      });
      const d = await res.json();
      if (d.success) {
        setRatesMsg('✅ ' + d.message);
        setRates({ usd_to_idr: parseFloat(ratesInput.usd_to_idr), otp_price_markup: parseFloat(ratesInput.otp_price_markup) });
      } else {
        setRatesMsg('❌ ' + (d.error || 'Gagal menyimpan'));
      }
    } catch { setRatesMsg('❌ Kesalahan jaringan'); }
    setRatesSaving(false);
  };

  const handleSaveSmtp = async () => {
    if (!session || smtpSaving) return;
    setSmtpSaving(true); setSmtpMsg('');
    try {
      const gmailUser = smtpInput.smtp_gmail_user.trim();
      const gmailPass = smtpInput.smtp_gmail_pass.trim();
      if (!gmailUser || !gmailPass) {
        setSmtpMsg('❌ Gmail User dan App Password wajib diisi.');
        setSmtpSaving(false);
        return;
      }
      const res = await fetch('/api/admin/smtp-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user: gmailUser, pass: gmailPass }),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpCount(data.data?.count || 0);
        setSmtpInput({ smtp_gmail_user: '', smtp_gmail_pass: '' });
        setSmtpMsg('✅ Akun SMTP Gmail ditambahkan');
      } else {
        setSmtpMsg('❌ ' + (data.error || 'Gagal menyimpan SMTP'));
      }
    } catch { setSmtpMsg('❌ Kesalahan jaringan'); }
    setSmtpSaving(false);
  };

  const handleAddBlacklist = async (idToAdd) => {
    if (!session || blackSaving) return;
    const val = (idToAdd || blackInput).trim();
    if (!val) return;
    setBlackSaving(true); setBlackMsg('');
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'add', id: val }),
      });
      const d = await res.json();
      if (d.success) {
        setBlacklistedIds(d.data || []);
        setBlackInput('');
        setBlackMsg('✅ ' + (d.message || 'ID berhasil diblacklist'));
        if (inspectList) {
          setInspectList(prev => prev?.map(item => d.data.includes(String(item.provider_id)) ? { ...item, is_blacklisted: true } : item));
        }
      } else {
        setBlackMsg('❌ ' + (d.error || 'Gagal menambahkan blacklist'));
      }
    } catch {
      setBlackMsg('❌ Terjadi kesalahan jaringan');
    }
    setBlackSaving(false);
  };

  const handleRemoveBlacklist = async (idToRemove) => {
    if (!session || blackSaving) return;
    setBlackSaving(true); setBlackMsg('');
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'remove', id: idToRemove }),
      });
      const d = await res.json();
      if (d.success) {
        setBlacklistedIds(d.data || []);
        setBlackMsg('✅ ' + (d.message || `ID ${idToRemove} dihapus dari blacklist`));
        if (inspectList) {
          setInspectList(prev => prev?.map(item => String(item.provider_id) === String(idToRemove) ? { ...item, is_blacklisted: false } : item));
        }
      } else {
        setBlackMsg('❌ ' + (d.error || 'Gagal menghapus'));
      }
    } catch {
      setBlackMsg('❌ Terjadi kesalahan jaringan');
    }
    setBlackSaving(false);
  };

  const handleClearAllBlacklist = async () => {
    if (!session || blackSaving) return;
    if (!confirm('Apakah kamu yakin ingin menghapus SEMUA blacklist Provider ID?')) return;
    setBlackSaving(true); setBlackMsg('');
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'clear' }),
      });
      const d = await res.json();
      if (d.success) {
        setBlacklistedIds([]);
        setBlackMsg('✅ Semua blacklist telah dibersihkan');
        if (inspectList) {
          setInspectList(prev => prev?.map(item => ({ ...item, is_blacklisted: false })));
        }
      }
    } catch {
      setBlackMsg('❌ Terjadi kesalahan jaringan');
    }
    setBlackSaving(false);
  };

  const handleInspectProviders = async () => {
    if (!session || inspectLoading) return;
    const ctry = inspectCountry.trim();
    const svc = inspectService.trim();
    if (!ctry || !svc) return;
    setInspectLoading(true); setInspectMsg(''); setInspectList(null);
    try {
      const res = await fetch(`/api/admin/blacklist?inspect=1&country=${encodeURIComponent(ctry)}&service=${encodeURIComponent(svc)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await res.json();
      if (d.success && Array.isArray(d.data)) {
        setInspectList(d.data);
        if (d.data.length === 0) {
          setInspectMsg('Tidak ada provider ditemukan untuk kombinasi ini.');
        }
      } else {
        setInspectMsg('❌ ' + (d.error || 'Gagal memuat provider dari SMS Bower'));
      }
    } catch {
      setInspectMsg('❌ Gagal terhubung ke API');
    }
    setInspectLoading(false);
  };

  if (!ready || !session) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:36, height:36, borderWidth:4 }} />
        <div style={{ color:'var(--text-3)', fontSize:'0.9rem' }}>Memuat Dashboard Admin...</div>
      </div>
    );
  }

  const maxDay = stats?.orders_per_day ? Math.max(...stats.orders_per_day.map(d => d.count), 1) : 1;

  return (
    <>
      <Navbar user={session} profile={profile} />
      <div className="page-with-sidebar">
        <Sidebar role="admin" />
        <main className="page-content">
          {/* Header */}
          <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'1.6rem' }}>📊</span> Dashboard Admin
              </h1>
              <p>Ringkasan performa & statistik bisnis DuniaNokos</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => session && loadAll(session.access_token)}>
              🔄 Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:24 }}>
            <StatCard icon="💰" label="Total Penjualan" color="#00c896"
              value={stats ? `Rp${Number(stats.total_purchase).toLocaleString('id-ID')}` : 'Rp0'}
              sub="Semua waktu" loading={loading} />
            <StatCard icon="📈" label="Net Revenue" color="#7c6af7"
              value={stats ? `Rp${Number(stats.net_revenue).toLocaleString('id-ID')}` : 'Rp0'}
              sub="Penjualan − Refund" loading={loading} />
            <StatCard icon="✅" label="Order Selesai" color="#00b4d8"
              value={stats ? stats.completed_orders.toLocaleString() : '0'}
              sub="Status completed" loading={loading} />
            <StatCard icon="👥" label="Total User" color="#f4a261"
              value={stats ? stats.total_users.toLocaleString() : '0'}
              sub="Akun terdaftar" loading={loading} />
            <StatCard icon="↩️" label="Total Refund" color="#e63946"
              value={stats ? `Rp${Number(stats.total_refund).toLocaleString('id-ID')}` : 'Rp0'}
              sub={stats ? `${stats.canceled_orders} dibatalkan` : '0 dibatalkan'} loading={loading} />
          </div>

          {/* Chart + Provider Balance */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
            {/* Mini chart */}
            <div className="card">
              <div className="card-title" style={{ marginBottom:16, fontSize:'0.9rem' }}>📅 Order 7 Hari Terakhir</div>
              {loading ? (
                <div style={{ height:80, background:'var(--bg-2)', borderRadius:8, animation:'pulse 1.5s infinite' }} />
              ) : stats?.orders_per_day?.length > 0 ? (
                <>
                  <MiniBar data={stats.orders_per_day} maxVal={maxDay} />
                  <div style={{ marginTop:12, display:'flex', gap:16, fontSize:'0.78rem', color:'var(--text-3)' }}>
                    <span>Total: <strong style={{ color:'var(--text-1)' }}>{stats.orders_per_day.reduce((s,d)=>s+d.count,0)} order</strong></span>
                  </div>
                </>
              ) : (
                <div style={{ color:'var(--text-3)', fontSize:'0.85rem' }}>Belum ada data</div>
              )}
            </div>

            {/* Provider balance */}
            <div className="card">
              <div className="card-title" style={{ marginBottom:16, fontSize:'0.9rem' }}>⚡ Saldo Provider</div>
              {loading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[0].map(i => <div key={i} style={{ height:48, background:'var(--bg-2)', borderRadius:8, animation:'pulse 1.5s infinite' }} />)}
                </div>
              ) : providerBalance?.smsbower ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(() => {
                    const srv = providerBalance.smsbower;
                    return (
                      <div style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'12px 14px', background:'var(--bg-2)', borderRadius:'var(--radius-sm)',
                        border:'1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-3)', marginBottom:2 }}>SMS Bower</div>
                          <div style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>{srv.email || srv.username}</div>
                        </div>
                        <div style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent)', fontSize:'1rem' }}>
                          {srv.formated}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ color:'var(--text-3)', fontSize:'0.85rem' }}>Gagal memuat saldo provider</div>
              )}
            </div>
          </div>

          {/* Deposit Toggle */}
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: depositOpen ? 'rgba(0,200,150,0.15)' : 'rgba(230,57,70,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0, transition: 'background 0.3s',
              }}>
                {depositOpen ? '🔓' : '🔒'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 4 }}>
                  Status Deposit
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                  {depositOpen
                    ? 'Deposit terbuka — user dapat melakukan top up saldo.'
                    : 'Deposit ditutup — user tidak dapat melakukan top up saldo.'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleDeposit}
              disabled={depositToggling || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${depositOpen ? '#e63946' : '#00c896'}`,
                background: depositOpen ? 'rgba(230,57,70,0.1)' : 'rgba(0,200,150,0.1)',
                color: depositOpen ? '#e63946' : '#00c896',
                fontWeight: 700, fontSize: '0.88rem', cursor: depositToggling ? 'not-allowed' : 'pointer',
                opacity: depositToggling || loading ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {depositToggling
                ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'currentColor', borderTopColor: 'transparent' }} /> Menyimpan...</>
                : depositOpen ? '🔒 Tutup Deposit' : '🔓 Buka Deposit'
              }
            </button>
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, border: maintenanceMode ? '1px solid #f59e0b' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: maintenanceMode ? 'rgba(245, 158, 11, 0.18)' : 'rgba(100, 116, 139, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0, transition: 'background 0.3s',
              }}>
                {maintenanceMode ? '🚧' : '🌐'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>
                    Mode Pemeliharaan (Under Maintenance)
                  </span>
                  {maintenanceMode && (
                    <span className="badge badge-waiting" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderColor: '#f59e0b' }}>
                      AKTIF
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                  {maintenanceMode
                    ? 'Maintenance aktif: Semua user dialihkan ke halaman perbaikan. Admin tetap bisa akses & login via /login.'
                    : 'Website normal: Seluruh user dan pengunjung dapat mengakses website seperti biasa.'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceToggling || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${maintenanceMode ? '#00c896' : '#f59e0b'}`,
                background: maintenanceMode ? 'rgba(0,200,150,0.1)' : 'rgba(245, 158, 11, 0.12)',
                color: maintenanceMode ? '#00c896' : '#f59e0b',
                fontWeight: 700, fontSize: '0.88rem', cursor: maintenanceToggling ? 'not-allowed' : 'pointer',
                opacity: maintenanceToggling || loading ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {maintenanceToggling
                ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'currentColor', borderTopColor: 'transparent' }} /> Menyimpan...</>
                : maintenanceMode ? '✅ Matikan Maintenance' : '🚧 Aktifkan Maintenance'
              }
            </button>
          </div>

          {/* Rate Setting */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16, fontSize: '0.9rem' }}>💱 Pengaturan Kurs & Markup</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>
                  Kurs USD → IDR
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>$1 =</span>
                  <input
                    type="number"
                    value={ratesInput.usd_to_idr}
                    onChange={e => setRatesInput(v => ({ ...v, usd_to_idr: e.target.value }))}
                    placeholder="17945"
                    style={{
                      flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                      color: 'var(--text-1)', fontFamily: 'var(--mono)', fontSize: '0.9rem',
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>IDR</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                  Aktif: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Rp{rates.usd_to_idr.toLocaleString('id-ID')}</strong>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>
                  Markup Harga
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    value={ratesInput.otp_price_markup}
                    onChange={e => setRatesInput(v => ({ ...v, otp_price_markup: e.target.value }))}
                    placeholder="1.7"
                    style={{
                      flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                      color: 'var(--text-1)', fontFamily: 'var(--mono)', fontSize: '0.9rem',
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>×</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                  Aktif: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{rates.otp_price_markup}×</strong>
                  &nbsp;·&nbsp; Contoh $0.05 → <strong style={{ color: 'var(--accent)' }}>Rp{Math.ceil(0.05 * rates.usd_to_idr * rates.otp_price_markup).toLocaleString('id-ID')}</strong>
                </div>
              </div>
            </div>
            {ratesMsg && (
              <div style={{
                fontSize: '0.82rem', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: ratesMsg.startsWith('✅') ? 'rgba(0,200,150,0.1)' : 'rgba(230,57,70,0.1)',
                color: ratesMsg.startsWith('✅') ? 'var(--green)' : '#e63946',
                marginBottom: 12,
              }}>{ratesMsg}</div>
            )}
            <button
              onClick={handleSaveRates}
              disabled={ratesSaving}
              style={{
                padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                cursor: ratesSaving ? 'not-allowed' : 'pointer',
                opacity: ratesSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {ratesSaving
                ? <><span className="spinner" style={{ width: 13, height: 13, borderColor: '#fff', borderTopColor: 'transparent' }} /> Menyimpan...</>
                : '💾 Simpan Kurs'}
            </button>
          </div>

          {/* Blacklist Provider ID Setting */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="card-title" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span>🚫</span> Blacklist Provider ID (SMS Bower)
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                Total terblokir: <strong style={{ color: blacklistedIds.length > 0 ? '#e63946' : 'var(--text-1)', fontFamily: 'var(--mono)' }}>{blacklistedIds.length}</strong>
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>
              Provider ID yang dimasukkan ke daftar blacklist <strong>tidak akan muncul</strong> pada daftar pilihan harga order dan tidak akan dipilih oleh sistem saat pemesanan nomor.
            </div>

            {/* Input manual provider ID */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={blackInput}
                onChange={e => setBlackInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddBlacklist(); }}
                placeholder="Masukkan Provider ID (contoh: 3178 atau pisahkan koma: 3178, 1024)"
                style={{
                  flex: 1, minWidth: 260, background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '9px 12px',
                  color: 'var(--text-1)', fontFamily: 'var(--mono)', fontSize: '0.88rem',
                }}
              />
              <button
                onClick={() => handleAddBlacklist()}
                disabled={blackSaving || !blackInput.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                  background: '#e63946', border: 'none', color: '#fff',
                  fontWeight: 700, fontSize: '0.85rem', cursor: (blackSaving || !blackInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (blackSaving || !blackInput.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {blackSaving ? 'Menyimpan...' : '➕ Blacklist ID'}
              </button>
            </div>

            {blackMsg && (
              <div style={{
                fontSize: '0.82rem', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: blackMsg.startsWith('✅') ? 'rgba(0,200,150,0.1)' : 'rgba(230,57,70,0.1)',
                color: blackMsg.startsWith('✅') ? 'var(--green)' : '#e63946',
                marginBottom: 14,
              }}>{blackMsg}</div>
            )}

            {/* Daftar Badges / Chips ID Terblokir */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 8, fontWeight: 500 }}>
                Daftar Provider ID yang Diblokir:
              </div>
              {blacklistedIds.length === 0 ? (
                <div style={{ padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                  Belum ada Provider ID yang diblacklist.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {blacklistedIds.map(id => (
                    <span
                      key={id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.3)',
                        borderRadius: 20, padding: '4px 12px', fontSize: '0.82rem',
                        fontFamily: 'var(--mono)', color: '#e63946', fontWeight: 600,
                      }}
                    >
                      <span>🚫 {id}</span>
                      <button
                        onClick={() => handleRemoveBlacklist(id)}
                        title={`Hapus ID ${id} dari blacklist`}
                        style={{
                          background: 'transparent', border: 'none', color: '#e63946',
                          cursor: 'pointer', padding: 0, marginLeft: 2, fontSize: '0.95rem',
                          lineHeight: 1, display: 'flex', alignItems: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={handleClearAllBlacklist}
                    style={{
                      background: 'transparent', border: '1px dashed var(--border)',
                      borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem',
                      color: 'var(--text-3)', cursor: 'pointer', marginLeft: 4,
                    }}
                  >
                    🗑 Hapus Semua
                  </button>
                </div>
              )}
            </div>

            {/* Tool Inspeksi Provider ID per Layanan */}
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14,
            }}>
              <div
                onClick={() => setShowInspector(v => !v)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', userSelect: 'none',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔍</span> Cek & Temukan Provider ID dari SMS Bower {showInspector ? '▲' : '▼'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                  {showInspector ? 'Tutup' : 'Buka Inspector'}
                </span>
              </div>

              {showInspector && (
                <div style={{ marginTop: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 12 }}>
                    Cari daftar provider untuk negara & layanan tertentu untuk melihat ID, stok, dan harga terkini secara langsung.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>ID Negara</label>
                      <input
                        type="text"
                        value={inspectCountry}
                        onChange={e => setInspectCountry(e.target.value)}
                        placeholder="Contoh: 6 (Indonesia)"
                        style={{
                          width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '7px 10px',
                          color: 'var(--text-1)', fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Kode Layanan</label>
                      <input
                        type="text"
                        value={inspectService}
                        onChange={e => setInspectService(e.target.value)}
                        placeholder="Contoh: wa (WhatsApp)"
                        style={{
                          width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '7px 10px',
                          color: 'var(--text-1)', fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <button
                      onClick={handleInspectProviders}
                      disabled={inspectLoading}
                      style={{
                        padding: '7px 16px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent)', border: 'none', color: '#fff',
                        fontWeight: 600, fontSize: '0.82rem', cursor: inspectLoading ? 'not-allowed' : 'pointer',
                        opacity: inspectLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {inspectLoading ? 'Memuat...' : '🔍 Cek Provider'}
                    </button>
                  </div>

                  {inspectMsg && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 10 }}>{inspectMsg}</div>
                  )}

                  {inspectList && inspectList.length > 0 && (
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-3)' }}>
                            <th style={{ padding: '8px 10px' }}>Provider ID</th>
                            <th style={{ padding: '8px 10px' }}>Harga (IDR)</th>
                            <th style={{ padding: '8px 10px' }}>Harga ($)</th>
                            <th style={{ padding: '8px 10px' }}>Stok</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectList.map(prov => {
                            const isBl = blacklistedIds.includes(String(prov.provider_id));
                            return (
                              <tr key={prov.provider_id} style={{
                                borderBottom: '1px solid var(--border)',
                                background: isBl ? 'rgba(230,57,70,0.06)' : 'transparent',
                              }}>
                                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: isBl ? '#e63946' : 'var(--text-1)' }}>
                                  {prov.provider_id}
                                </td>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--accent)' }}>
                                  {prov.price_format}
                                </td>
                                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
                                  ${prov.price_usd}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-2)' }}>
                                  {prov.stock.toLocaleString('id-ID')}
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  {isBl ? (
                                    <span style={{ color: '#e63946', fontSize: '0.72rem', fontWeight: 600 }}>🚫 DIBLOKIR</span>
                                  ) : (
                                    <span style={{ color: 'var(--green)', fontSize: '0.72rem', fontWeight: 600 }}>✓ AKTIF</span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  {isBl ? (
                                    <button
                                      onClick={() => handleRemoveBlacklist(prov.provider_id)}
                                      disabled={blackSaving}
                                      style={{
                                        padding: '3px 8px', fontSize: '0.72rem', borderRadius: 4,
                                        background: 'rgba(0,200,150,0.15)', color: 'var(--green)',
                                        border: '1px solid rgba(0,200,150,0.3)', cursor: 'pointer',
                                      }}
                                    >
                                      ✓ Aktifkan
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleAddBlacklist(prov.provider_id)}
                                      disabled={blackSaving}
                                      style={{
                                        padding: '3px 8px', fontSize: '0.72rem', borderRadius: 4,
                                        background: 'rgba(230,57,70,0.15)', color: '#e63946',
                                        border: '1px solid rgba(230,57,70,0.3)', cursor: 'pointer',
                                      }}
                                    >
                                      🚫 Blacklist
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SMTP Gmail Setting */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16, fontSize: '0.9rem' }}>📧 SMTP Gmail WA Tools</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 12 }}>
              Akun aktif tersimpan: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{smtpCount}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>
                  Gmail User
                </label>
                <input
                  type="email"
                  value={smtpInput.smtp_gmail_user}
                  onChange={e => setSmtpInput(v => ({ ...v, smtp_gmail_user: e.target.value }))}
                  placeholder="gmail@gmail.com"
                  style={{
                    width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    color: 'var(--text-1)', fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>
                  Gmail App Password
                </label>
                <input
                  type="password"
                  value={smtpInput.smtp_gmail_pass}
                  onChange={e => setSmtpInput(v => ({ ...v, smtp_gmail_pass: e.target.value }))}
                  placeholder="xxxx xxxx xxxx xxxx"
                  style={{
                    width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    color: 'var(--text-1)', fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: 12 }}>
              Dipakai bergantian untuk kirim appeal Fix Login Tidak Tersedia. Gunakan App Password Gmail, bukan password login akun.
            </div>
            {smtpMsg && (
              <div style={{
                fontSize: '0.82rem', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: smtpMsg.startsWith('✅') ? 'rgba(0,200,150,0.1)' : 'rgba(230,57,70,0.1)',
                color: smtpMsg.startsWith('✅') ? 'var(--green)' : '#e63946',
                marginBottom: 12,
              }}>{smtpMsg}</div>
            )}
            <button
              onClick={handleSaveSmtp}
              disabled={smtpSaving}
              style={{
                padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: '0.85rem', cursor: smtpSaving ? 'not-allowed' : 'pointer',
                opacity: smtpSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {smtpSaving
                ? <><span className="spinner" style={{ width: 13, height: 13, borderColor: '#fff', borderTopColor: 'transparent' }} /> Menyimpan...</>
                : '➕ Tambah SMTP Gmail'}
            </button>
          </div>

          {/* Quick nav */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {[
              { href:'/admin/users', icon:'👥', title:'Kelola User', desc:'Lihat daftar user & topup saldo' },
              { href:'/admin/orders', icon:'📋', title:'Kelola Order', desc:'Monitor order & refund manual' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                display:'block', textDecoration:'none',
                background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:'var(--radius)', padding:'20px 24px',
                transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform=''; }}
              >
                <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{item.icon}</div>
                <div style={{ fontWeight:600, color:'var(--text-1)', marginBottom:4 }}>{item.title}</div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>{item.desc}</div>
              </a>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
