'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useProfile } from '@/lib/useProfile';

export default function AdminUsersPage() {
  const router = useRouter();
  const { session, profile, ready } = useProfile();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupModal, setTopupModal] = useState(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [deductModal, setDeductModal] = useState(null);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductNote, setDeductNote] = useState('');
  const [deductLoading, setDeductLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!ready) return;
    if (!session) { router.push('/login'); return; }
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
    loadUsers(session.access_token);
  }, [ready, session, profile]);

  const loadUsers = async (token) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {}
    setLoading(false);
  };

  const handleTopup = async () => {
    if (!topupAmount || parseInt(topupAmount) <= 0) {
      setMsg({ type: 'error', text: 'Masukkan nominal yang valid' }); return;
    }
    setTopupLoading(true);
    try {
      const res = await fetch('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: topupModal.user_id, amount: parseInt(topupAmount), note: topupNote }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: `✅ Berhasil topup Rp${parseInt(topupAmount).toLocaleString('id-ID')} ke ${topupModal.username}` });
        setTopupModal(null);
        setTopupAmount('');
        setTopupNote('');
        loadUsers(session.access_token);
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch { setMsg({ type: 'error', text: 'Gagal topup' }); }
    setTopupLoading(false);
  };

  const handleDeduct = async () => {
    if (!deductAmount || parseInt(deductAmount) <= 0) {
      setMsg({ type: 'error', text: 'Masukkan nominal penarikan yang valid' }); return;
    }
    setDeductLoading(true);
    try {
      const res = await fetch('/api/admin/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: deductModal.user_id, amount: parseInt(deductAmount), note: deductNote }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: `✅ Berhasil menarik Rp${parseInt(deductAmount).toLocaleString('id-ID')} dari ${deductModal.username}` });
        setDeductModal(null);
        setDeductAmount('');
        setDeductNote('');
        loadUsers(session.access_token);
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch { setMsg({ type: 'error', text: 'Gagal menarik saldo' }); }
    setDeductLoading(false);
  };

  if (!ready || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 4 }} />
        <div style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Memuat...</div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (u.username || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <>
      <Navbar user={session} profile={profile} />
      <div className="page-with-sidebar">
        <Sidebar role="admin" />
        <main className="page-content">
          <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'1.6rem' }}>👥</span> Kelola User
              </h1>
              <p>Lihat daftar pengguna dan kelola saldo mereka</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => loadUsers(session.access_token)}>
              🔄 Refresh
            </button>
          </div>

          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}
              style={{ cursor: 'pointer', marginBottom: 16 }} onClick={() => setMsg({ type: '', text: '' })}>
              {msg.text}
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div className="card-title">👥 Daftar User ({filteredUsers.length})</div>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', maxWidth: 280 }}
                placeholder="🔍 Cari username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="loading-overlay"><div className="spinner" /> Memuat...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pengguna</th>
                      <th>Role</th>
                      <th>Saldo</th>
                      <th>Bergabung</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `hsl(${(u.username?.charCodeAt(0) || 65) * 5 % 360}, 60%, 35%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {(u.username || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500 }}>{u.username}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-waiting'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="mono-cell" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          Rp{Number(u.balance).toLocaleString('id-ID')}
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                          {new Date(u.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary btn-sm"
                              onClick={() => { setTopupModal({ user_id: u.id, username: u.username }); setTopupAmount(''); setTopupNote(''); }}>
                              ＋ Topup
                            </button>
                            <button className="btn btn-sm"
                              onClick={() => { setDeductModal({ user_id: u.id, username: u.username, balance: u.balance }); setDeductAmount(''); setDeductNote(''); }}
                              style={{
                                background: 'rgba(230,57,70,0.12)',
                                border: '1px solid rgba(230,57,70,0.4)',
                                color: 'var(--red)',
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              － Tarik
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>
                          Tidak ada user ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Topup Modal */}
          {topupModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="card" style={{ width: 400, background: 'var(--bg-1)', border: '1px solid var(--accent)' }}>
                <div className="card-title" style={{ marginBottom: 20 }}>＋ Topup Saldo — {topupModal.username}</div>
                <div className="form-group">
                  <label className="form-label">Nominal (Rp)</label>
                  <input className="form-input" type="number" placeholder="contoh: 50000"
                    value={topupAmount} onChange={e => setTopupAmount(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan (opsional)</label>
                  <input className="form-input" type="text" placeholder="Transfer BCA, dll"
                    value={topupNote} onChange={e => setTopupNote(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-full" onClick={handleTopup} disabled={topupLoading}>
                    {topupLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Proses...</> : 'Topup'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setTopupModal(null); setTopupAmount(''); }}>Batal</button>
                </div>
              </div>
            </div>
          )}

          {/* Deduct Modal */}
          {deductModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="card" style={{ width: 400, background: 'var(--bg-1)', border: '1px solid var(--red)' }}>
                <div className="card-title" style={{ marginBottom: 8, color: 'var(--red)' }}>－ Tarik Saldo — {deductModal.username}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 16 }}>
                  Saldo saat ini: <strong style={{ color: 'var(--accent)' }}>Rp{Number(deductModal.balance || 0).toLocaleString('id-ID')}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Nominal Tarik (Rp)</label>
                  <input className="form-input" type="number" placeholder="contoh: 25000"
                    value={deductAmount} onChange={e => setDeductAmount(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Alasan / Catatan (opsional)</label>
                  <input className="form-input" type="text" placeholder="Penarikan manual, koreksi saldo, dll"
                    value={deductNote} onChange={e => setDeductNote(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-full" onClick={handleDeduct} disabled={deductLoading}
                    style={{ background: 'var(--red)', color: '#fff', border: 'none', fontWeight: 600 }}>
                    {deductLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Proses...</> : 'Tarik Saldo'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setDeductModal(null); setDeductAmount(''); }}>Batal</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
