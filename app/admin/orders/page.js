'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useProfile } from '@/lib/useProfile';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua', color: 'var(--text-2)' },
  { value: 'waiting', label: 'Waiting', color: 'var(--yellow)' },
  { value: 'received', label: 'Received OTP', color: 'var(--accent)' },
  { value: 'completed', label: 'Selesai', color: 'var(--green)' },
  { value: 'canceled', label: 'Dibatalkan', color: 'var(--red)' },
];

const STATUS_BADGE = {
  waiting: 'badge-waiting',
  expiring: 'badge-waiting',
  received: 'badge-info',
  completed: 'badge-success',
  canceled: 'badge-danger',
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { session, profile, ready } = useProfile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refundModal, setRefundModal] = useState(null); // {order_id, username, price, service}
  const [refundLoading, setRefundLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(null); // order object
  const [copied, setCopied] = useState('');
  const copyText = (text) => {
    try { navigator.clipboard.writeText(String(text)); setCopied(String(text)); setTimeout(() => setCopied(''), 1500); } catch {}
  };
  const getCodes = (o) => (Array.isArray(o.otp_codes) && o.otp_codes.length)
    ? o.otp_codes
    : (o.otp_code && o.otp_code !== '-' ? [o.otp_code] : []);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!ready) return;
    if (!session) { router.push('/login'); return; }
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
    loadOrders(session.access_token, statusFilter, page);
  }, [ready, session, profile]);

  useEffect(() => {
    if (session?.access_token) {
      loadOrders(session.access_token, statusFilter, page);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const loadOrders = async (token, status, pg) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?status=${status}&page=${pg}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setTotalCount(data.count || 0);
      }
    } catch {}
    setLoading(false);
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefundLoading(true);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ order_id: refundModal.order_id }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message || '✅ Refund berhasil!' });
        setRefundModal(null);
        loadOrders(session.access_token, statusFilter, page);
      } else {
        setMsg({ type: 'error', text: data.error || 'Gagal refund' });
      }
    } catch { setMsg({ type: 'error', text: 'Terjadi kesalahan jaringan' }); }
    setRefundLoading(false);
  };

  const totalPages = Math.ceil(totalCount / 30);

  if (!ready || !session) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:36, height:36, borderWidth:4 }} />
        <div style={{ color:'var(--text-3)', fontSize:'0.9rem' }}>Memuat...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar user={session} profile={profile} />
      <div className="page-with-sidebar">
        <Sidebar role="admin" />
        <main className="page-content">
          <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'1.6rem' }}>📋</span> Kelola Order
              </h1>
              <p>Monitor semua pesanan &amp; lakukan refund manual</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => loadOrders(session.access_token, statusFilter, page)}>
              🔄 Refresh
            </button>
          </div>

          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}
              style={{ cursor:'pointer', marginBottom:16 }} onClick={() => setMsg({ type:'', text:'' })}>
              {msg.text}
            </div>
          )}

          {/* Info refund */}
          <div style={{
            background:'rgba(230,57,70,0.08)', border:'1px solid rgba(230,57,70,0.25)',
            borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:16,
            fontSize:'0.8rem', color:'var(--text-2)', lineHeight:1.7,
          }}>
            ℹ️ <strong>Refund Manual:</strong> Tombol <span style={{ color:'var(--red)' }}>Refund</span> akan mengembalikan saldo ke akun user &amp; mengubah status pesanan menjadi <strong>Dibatalkan</strong> (data pesanan tetap tersimpan di riwayat).
          </div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                style={{
                  padding:'6px 14px', borderRadius:20, border:`1px solid ${statusFilter === s.value ? s.color : 'var(--border)'}`,
                  background: statusFilter === s.value ? `${s.color}22` : 'var(--bg-2)',
                  color: statusFilter === s.value ? s.color : 'var(--text-3)',
                  fontSize:'0.8rem', fontWeight: statusFilter === s.value ? 600 : 400,
                  cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)',
                }}>
                {s.label}
              </button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-3)', alignSelf:'center' }}>
              {totalCount} order
            </span>
          </div>

          <div className="card" style={{ padding:0 }}>
            {loading ? (
              <div className="loading-overlay" style={{ padding:40 }}><div className="spinner" /> Memuat...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Layanan</th>
                      <th>Nomor</th>
                      <th>OTP</th>
                      <th>Status</th>
                      <th>Harga</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => {
                      const isActive = ['waiting', 'expiring'].includes(o.status);
                      const isStuck = isActive || o.status === 'received';
                      return (
                        <tr key={o.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{
                                width:28, height:28, borderRadius:'50%', flexShrink:0,
                                background:`hsl(${(o.username?.charCodeAt(0)||65)*5%360}, 55%, 35%)`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:'0.72rem', fontWeight:700, color:'#fff',
                              }}>
                                {(o.username||'?')[0].toUpperCase()}
                              </div>
                              <span style={{ fontSize:'0.85rem', fontWeight:500 }}>{o.username}</span>
                            </div>
                          </td>
                          <td style={{ fontSize:'0.82rem', maxWidth:160 }}>
                            <div style={{ fontWeight:500 }}>{o.service}</div>
                            <div style={{ color:'var(--text-3)', fontSize:'0.72rem' }}>{o.country} · {o.server}</div>
                          </td>
                          <td style={{ fontFamily:'var(--mono)', fontSize:'0.82rem', color:'var(--text-2)' }}>
                            {o.phone_number || '—'}
                          </td>
                          <td style={{ fontFamily:'var(--mono)', fontSize:'0.82rem' }}>
                            {(() => {
                              const codes = getCodes(o);
                              if (codes.length === 0) return <span style={{ color:'var(--text-3)' }}>—</span>;
                              const isExpired = o.expires_at && new Date(o.expires_at).getTime() <= Date.now();
                              const showPending = o.status === 'received' && o.resend_pending && !isExpired;
                              return (
                                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                  {codes.map((c, i) => (
                                    <span key={i} style={{ color:'var(--green)', fontWeight:600 }}>
                                      {codes.length > 1 && <span style={{ color:'var(--text-3)', fontWeight:400, fontSize:'0.7rem' }}>#{i + 1} </span>}{c}
                                    </span>
                                  ))}
                                  {showPending && <span style={{ color:'var(--yellow)', fontSize:'0.7rem' }}>⏳ menunggu kode berikutnya</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[o.status] || 'badge-waiting'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ fontFamily:'var(--mono)', color:'var(--accent)', fontSize:'0.82rem', fontWeight:600 }}>
                            Rp{Number(o.price).toLocaleString('id-ID')}
                          </td>
                          <td style={{ color:'var(--text-3)', fontSize:'0.75rem', whiteSpace:'nowrap' }}>
                            {new Date(o.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </td>
                          <td style={{ whiteSpace:'nowrap' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Lihat detail order"
                              onClick={() => setDetailModal(o)}
                              style={{ marginRight:6, padding:'4px 10px', fontSize:'0.9rem' }}
                            >
                              👁
                            </button>
                            {o.status === 'canceled' ? (
                              <span style={{ fontSize:'0.75rem', color:'var(--text-3)', padding:'4px 8px' }}>—</span>
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => setRefundModal({ order_id: o.order_id, username: o.username, price: o.price, service: o.service })}
                                style={{
                                  background:'rgba(230,57,70,0.12)', border:'1px solid rgba(230,57,70,0.4)',
                                  color:'var(--red)', fontWeight:600, fontSize:'0.75rem',
                                  padding:'4px 10px', borderRadius:6, cursor:'pointer',
                                  transition:'all 0.15s', fontFamily:'var(--font)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(230,57,70,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(230,57,70,0.12)'; }}
                              >
                                ↩ Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && !loading && (
                      <tr>
                        <td colSpan={8} style={{ textAlign:'center', color:'var(--text-3)', padding:40 }}>
                          Tidak ada order ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize:'0.85rem', color:'var(--text-2)', alignSelf:'center' }}>
                  Hal {page} / {totalPages}
                </span>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>

          {/* Detail Order Modal */}
          {detailModal && (
            <div onClick={() => setDetailModal(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
              <div className="card" onClick={e => e.stopPropagation()}
                style={{ width:460, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto', background:'var(--bg-1)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div className="card-title" style={{ margin:0 }}>👁 Detail Order</div>
                  <span className={`badge ${STATUS_BADGE[detailModal.status] || 'badge-waiting'}`}>{detailModal.status}</span>
                </div>

                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius-sm)', padding:'12px 14px', fontSize:'0.85rem', lineHeight:1.9, marginBottom:14 }}>
                  <div><span style={{ color:'var(--text-3)' }}>User:</span> <strong>{detailModal.username}</strong></div>
                  <div><span style={{ color:'var(--text-3)' }}>Layanan:</span> {detailModal.service} · {detailModal.country}</div>
                  <div><span style={{ color:'var(--text-3)' }}>Harga:</span> Rp{Number(detailModal.price).toLocaleString('id-ID')}</div>
                  <div><span style={{ color:'var(--text-3)' }}>Order ID:</span> <span style={{ fontFamily:'var(--mono)', fontSize:'0.78rem' }}>{detailModal.order_id}</span></div>
                  <div><span style={{ color:'var(--text-3)' }}>Dibuat:</span> {new Date(detailModal.created_at).toLocaleString('id-ID')}</div>
                  {detailModal.expires_at && <div><span style={{ color:'var(--text-3)' }}>Expired:</span> {new Date(detailModal.expires_at).toLocaleString('id-ID')}</div>}
                </div>

                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Nomor</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:'1.05rem', fontWeight:600 }}>{detailModal.phone_number || '—'}</span>
                  {detailModal.phone_number && (
                    <button className="btn btn-ghost btn-sm" onClick={() => copyText(detailModal.phone_number)}>
                      {copied === String(detailModal.phone_number) ? '✅' : '📋'}
                    </button>
                  )}
                </div>

                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Kode OTP</div>
                {(() => {
                  const codes = getCodes(detailModal);
                  if (codes.length === 0) return <div style={{ color:'var(--text-3)', fontSize:'0.85rem', marginBottom:14 }}>Belum ada kode masuk</div>;
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                      {codes.map((c, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-2)', border:'1px dashed var(--accent)', borderRadius:'var(--radius-sm)', padding:'8px 12px' }}>
                          <div>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>Kode {i + 1}{i === codes.length - 1 && codes.length > 1 ? ' (terbaru)' : ''}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:'1.3rem', fontWeight:700, color:'var(--accent)', letterSpacing:2 }}>{c}</div>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => copyText(c)}>{copied === String(c) ? '✅' : '📋'}</button>
                        </div>
                      ))}
                      {(() => {
                        const isExpired = detailModal.expires_at && new Date(detailModal.expires_at).getTime() <= Date.now();
                        if (detailModal.status === 'received' && detailModal.resend_pending && !isExpired) {
                          return <div style={{ color:'var(--yellow)', fontSize:'0.8rem' }}>⏳ User sudah minta SMS ulang — menunggu kode berikutnya</div>;
                        }
                        return null;
                      })()}
                    </div>
                  );
                })()}

                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>📩 Isi SMS (terbaru)</div>
                <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'0.85rem', fontFamily:'var(--mono)', lineHeight:1.6, wordBreak:'break-word', marginBottom:16 }}>
                  {detailModal.otp_text || <span style={{ color:'var(--text-3)' }}>Tidak ada isi SMS tersimpan</span>}
                </div>

                <button className="btn btn-ghost btn-full" onClick={() => setDetailModal(null)}>Tutup</button>
              </div>
            </div>
          )}

          {/* Refund Confirm Modal */}
          {refundModal && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
              <div className="card" style={{ width:420, background:'var(--bg-1)', border:'1px solid rgba(230,57,70,0.5)' }}>
                <div style={{ fontSize:'2rem', textAlign:'center', marginBottom:8 }}>⚠️</div>
                <div className="card-title" style={{ textAlign:'center', marginBottom:16, color:'var(--red)' }}>Konfirmasi Refund Manual</div>
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:16, fontSize:'0.85rem', lineHeight:1.8 }}>
                  <div><span style={{ color:'var(--text-3)' }}>User:</span> <strong>{refundModal.username}</strong></div>
                  <div><span style={{ color:'var(--text-3)' }}>Layanan:</span> {refundModal.service}</div>
                  <div><span style={{ color:'var(--text-3)' }}>Nominal Refund:</span> <strong style={{ color:'var(--accent)' }}>Rp{Number(refundModal.price).toLocaleString('id-ID')}</strong></div>
                  <div><span style={{ color:'var(--text-3)' }}>Order ID:</span> <span style={{ fontFamily:'var(--mono)', fontSize:'0.78rem' }}>{refundModal.order_id}</span></div>
                </div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-2)', marginBottom:20, textAlign:'center' }}>
                  Saldo sebesar <strong style={{ color:'var(--accent)' }}>Rp{Number(refundModal.price).toLocaleString('id-ID')}</strong> akan dikembalikan ke user &amp; status order diubah menjadi <strong>Dibatalkan</strong>. Data order tetap tersimpan di riwayat.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    className="btn btn-full"
                    onClick={handleRefund}
                    disabled={refundLoading}
                    style={{ background:'var(--red)', color:'#fff', border:'none', fontWeight:600 }}
                  >
                    {refundLoading ? <><span className="spinner" style={{ width:14, height:14 }} /> Proses...</> : '✅ Ya, Refund Sekarang'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setRefundModal(null)}>Batal</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
