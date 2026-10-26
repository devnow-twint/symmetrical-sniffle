/**
 * Inject test untuk fitur Resend SMS (jalankan dengan `npm run dev` aktif).
 * Kredensial dibaca dari .env.local — tidak ada key yang di-hardcode.
 *
 * Alur test:
 *   1) node test-resend.js create [username]
 *        → buat order test (RSTEST...) status 'received' dengan kode ke-1
 *   2) Buka /order, klik "Resend SMS" (order RSTEST tidak memanggil provider)
 *   3) node test-resend.js code2 <order_id> [kode]
 *        → kirim webhook kode ke-2 → di /order muncul Kode 1 & Kode 2
 *   4) node test-resend.js clean [order_id]
 *        → hapus order test (semua RSTEST kalau order_id kosong)
 *
 * Tambahan: node test-resend.js expire <order_id>  → set expires_at ke masa lalu
 *           (cek tombol "waktu aktivasi sudah melebihi 25 menit")
 */
const fs = require('fs');
const path = require('path');

// ── Load .env.local ─────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
});
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const key  = env.SUPABASE_SERVICE_ROLE_KEY;
const APP  = process.env.APP_URL || 'http://localhost:3000';
if (!base || !key) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local'); process.exit(1); }

const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

async function getUserId(username) {
  const url = username
    ? `${base}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id,username`
    : `${base}/rest/v1/profiles?select=id,username&limit=1`;
  const r = await fetch(url, { headers: H });
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows[0]) { console.error('❌ User tidak ditemukan:', username || '(profil terbaru)', JSON.stringify(rows)); process.exit(1); }
  return rows[0];
}

async function create(username) {
  const user = await getUserId(username);
  const orderId = 'RSTEST' + Date.now();
  const code1 = '111111';
  const res = await fetch(`${base}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      order_id: orderId,
      service: 'ResendTest',
      country: 'Indonesia',
      operator: 'any',
      phone_number: '6281234567890',
      status: 'received',
      otp_code: code1,
      otp_codes: [code1],
      otp_text: `Kode OTP pertama kamu: ${code1}`,
      resend_pending: false,
      price: 0,
      server: 'smsbower',
      expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    }),
  });
  const out = await res.json();
  if (!res.ok || !(out[0] || out).order_id) { console.error('❌ Gagal buat order:', JSON.stringify(out)); process.exit(1); }
  console.log(`✅ Order test dibuat untuk user "${user.username}"`);
  console.log(`   order_id : ${orderId}`);
  console.log(`   kode 1   : ${code1}`);
  console.log(`\n➡ Buka ${APP}/order → klik "Resend SMS"`);
  console.log(`➡ Lalu: node test-resend.js code2 ${orderId}`);
}

async function code2(orderId, code = '222222') {
  if (!orderId) { console.error('Usage: node test-resend.js code2 <order_id> [kode]'); process.exit(1); }
  const text = `Kode OTP kedua kamu: ${code}`;
  const r = await fetch(`${APP}/api/webhook/smsbower`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activationId: orderId, service: 'go', text, code, country: 6, receivedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }),
  });
  console.log(`📬 Webhook HTTP ${r.status}:`, await r.text());
  const c = await fetch(`${base}/rest/v1/orders?order_id=eq.${orderId}&select=status,otp_code,otp_codes,resend_pending,otp_text`, { headers: H });
  const row = (await c.json())[0];
  console.log('📋 DB:', JSON.stringify(row));
  if (row && Array.isArray(row.otp_codes) && row.otp_codes.length >= 2 && !row.resend_pending) console.log('🎉 Kode ke-2 tersimpan!');
  else console.log('⚠️  Belum 2 kode. Pastikan sudah klik "Resend SMS" (resend_pending=true) & dev server jalan.');
}

async function expire(orderId) {
  if (!orderId) { console.error('Usage: node test-resend.js expire <order_id>'); process.exit(1); }
  await fetch(`${base}/rest/v1/orders?order_id=eq.${orderId}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ expires_at: new Date(Date.now() - 60000).toISOString() }),
  });
  console.log('⏱ expires_at di-set ke masa lalu. Refresh /order untuk cek tombol resend nonaktif.');
}

async function clean(orderId) {
  const filter = orderId ? `order_id=eq.${orderId}` : 'order_id=like.RSTEST*';
  await fetch(`${base}/rest/v1/orders?${filter}`, { method: 'DELETE', headers: H });
  console.log('🧹 Order test dihapus:', orderId || 'semua RSTEST*');
}

const [cmd, a, b] = process.argv.slice(2);
const run = { create, code2, expire, clean }[cmd];
if (!run) { console.log('Perintah: create [username] | code2 <order_id> [kode] | expire <order_id> | clean [order_id]'); process.exit(1); }
run(a, b).catch(e => { console.error('❌', e.message); process.exit(1); });
