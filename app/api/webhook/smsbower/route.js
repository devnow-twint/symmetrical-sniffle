import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// SmsBower webhook IP yang diizinkan (dari dokumentasi resmi)
const ALLOWED_IPS = ['167.235.198.205'];

/**
 * SmsBower Webhook — Incoming SMS Notification
 * Docs: https://smsbower.online (profile settings → webhook URL)
 *
 * SmsBower POST payload:
 * {
 *   "activationId": 123456,
 *   "service": "go",
 *   "text": "Sms text",
 *   "code": "12345",
 *   "country": 2,
 *   "receivedAt": "2023-01-01 12:00:00"
 * }
 *
 * Set webhook URL di profil SmsBower:
 *   https://dunianokos.com/api/webhook/smsbower
 *
 * Response harus HTTP 200 agar SmsBower tidak retry.
 * Jika gagal, SmsBower retry 2x: +1 menit, +5 menit.
 */
export async function POST(request) {
  try {
    // ── IP Whitelist Check ──────────────────────────────────────────
    // Di development: skip IP check agar bisa test dari lokal
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      const forwarded = request.headers.get('x-forwarded-for') || '';
      const clientIp  = forwarded.split(',')[0].trim();

      if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIp)) {
        console.warn(`[webhook/smsbower] Rejected IP: ${clientIp}`);
        // Tetap return 200 agar tidak terlihat dari attacker mana yang dicek
        return NextResponse.json({ ok: false }, { status: 200 });
      }
    } else {
      console.log('[webhook/smsbower] DEV MODE — IP whitelist skipped');
    }

    // ── Parse Payload ───────────────────────────────────────────────
    const body = await request.json();
    const { activationId, code, text, service, country, receivedAt } = body;

    console.log(`[webhook/smsbower] Received: activationId=${activationId} code=${code} service=${service}`);

    // Validasi minimal — activationId dan code wajib ada
    if (!activationId || !code) {
      console.warn('[webhook/smsbower] Missing activationId or code, ignoring');
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const orderId  = String(activationId);
    const otpCode  = String(code).trim();

    // Abaikan kalau kode placeholder atau kosong
    if (!otpCode || ['-', 'menunggu', 'waiting'].includes(otpCode.toLowerCase())) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const supabase = getServiceSupabase();

    // ── Update Order: set otp_code + otp_text + status received ────────────────
    // Hanya update kalau masih waiting/expiring (idempotent)
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        otp_code:   otpCode,
        otp_text:   text || null,     // ← isi SMS lengkap (e.g. "Your code is 12345, valid 5 min")
        status:     'received',
      })
      .eq('order_id', orderId)
      .in('status', ['waiting', 'expiring'])
      .select('order_id, user_id, status')
      .maybeSingle();

    if (updateErr) {
      console.error('[webhook/smsbower] DB update error:', updateErr.message);
      // Return 200 agar SmsBower tidak retry terus (retry tidak akan fix DB error)
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 200 });
    }

    if (!updatedOrder) {
      // Order tidak ditemukan atau sudah final — bukan error, abaikan saja
      console.log(`[webhook/smsbower] order=${orderId} not found or already finalized, skipped`);
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    console.log(`[webhook/smsbower] ✅ OTP saved: order=${orderId} code=${otpCode} user=${updatedOrder.user_id}`);

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error('[webhook/smsbower] Unexpected error:', err.message);
    // Return 200 agar SmsBower tidak masuk retry loop karena error parsing dll.
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 200 });
  }
}

// SmsBower hanya POST — tolak method lain
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
