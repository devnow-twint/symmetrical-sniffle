import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { cancelOrder, doneOrder, getOrderStatus, resendOrder } from '@/lib/otpProvider';

export async function POST(request) {
  try {
    const { user } = await getAuthUser(request).catch(() => { throw new Error('UNAUTHORIZED'); });

    const { order_id, status, server } = await request.json();
    const selectedServer = server || 'server3';

    if (!order_id || !status) {
      return NextResponse.json({ error: 'order_id dan status wajib diisi' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Verify the order belongs to this user
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('price, user_id, status, server, created_at, expires_at, otp_code, otp_codes, resend_pending')
      .eq('order_id', order_id)
      .single();

    if (orderErr || !order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    if (order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // ── Resend SMS (SMS Bower setStatus=3 → ACCESS_RETRY_GET) ───────────
    if (status === 'resend') {
      const hasOtp = order.otp_code && order.otp_code !== '-';
      if (order.status !== 'received' || !hasOtp) {
        return NextResponse.json({ success: false, error: 'Resend hanya bisa dilakukan setelah kode OTP pertama masuk.' }, { status: 400 });
      }
      if (order.resend_pending) {
        return NextResponse.json({ success: false, error: 'Permintaan SMS ulang sedang diproses. Tunggu kode berikutnya.' }, { status: 400 });
      }
      if (Array.isArray(order.otp_codes) && order.otp_codes.length >= 2) {
        return NextResponse.json({ success: false, error: 'Resend SMS sudah tidak bisa dilakukan (maksimal 2 kode OTP).' }, { status: 400 });
      }
      if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ success: false, error: 'Resend SMS tidak bisa dilakukan (waktu aktivasi sudah melebihi 25 menit).' }, { status: 400 });
      }

      const isTestOrder = String(order_id).startsWith('RSTEST') && process.env.NODE_ENV !== 'production';
      const data = isTestOrder ? { success: true } : await resendOrder(order_id);
      console.log(`[resend] order=${order_id} response=`, JSON.stringify(data));
      if (!data.success) {
        return NextResponse.json({ success: false, error: data.message || 'Gagal meminta SMS ulang.' }, { status: 400 });
      }

      const codes = Array.isArray(order.otp_codes) && order.otp_codes.length > 0 ? order.otp_codes : [order.otp_code];
      await supabase.from('orders')
        .update({ otp_codes: codes, resend_pending: true })
        .eq('order_id', order_id)
        .eq('status', 'received');

      return NextResponse.json({ success: true, message: 'Permintaan SMS ulang dikirim. Menunggu kode berikutnya.' });
    }

    // ── Mark as completed (user confirms OTP received) ──────────────────
    if (status === 'complete') {
      if (['canceled', 'completed'].includes(order.status)) {
        return NextResponse.json({ success: false, error: 'Pesanan sudah dibatalkan atau diselesaikan sebelumnya.' }, { status: 400 });
      }
      // Notify SMS Bower that activation is confirmed (status=6)
      try { await doneOrder(order_id); } catch { }
      const { data: completedOrder } = await supabase.from('orders')
        .update({ status: 'completed', resend_pending: false })
        .eq('order_id', order_id)
        .in('status', ['received', 'waiting', 'expiring'])
        .select()
        .maybeSingle();
      if (!completedOrder) {
        return NextResponse.json({ success: false, error: 'Pesanan sudah dibatalkan atau diselesaikan sebelumnya.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Pesanan selesai' });
    }

    // ── Cancel flow ──────────────────────────────────────────────────────
    if (status === 'cancel') {
      const isRealOtp = (code) => {
        if (!code || code === '-') return false;
        const placeholders = ['menunggu', 'waiting', 'pending'];
        return !placeholders.includes(String(code).trim().toLowerCase());
      };

      // 1. Cek apakah di DB sudah ada OTP valid
      if (isRealOtp(order.otp_code) || order.status === 'completed') {
        return NextResponse.json({
          success: false,
          has_otp: true,
          otp_code: order.otp_code,
          status: order.status || 'received',
          error: 'Kode OTP sudah masuk! Pesanan tidak dapat dibatalkan.',
        }, { status: 400 });
      }

      // 2. CEK STATUS KE PROVIDER TERLEBIH DAHULU SEBELUM CANCEL
      // Memastikan jika OTP baru saja masuk di provider, kita ambil kodenya dan jangan batalkan
      try {
        const orderServer = order.server || 'smsbower';
        const provStatus = await getOrderStatus(order_id, orderServer);
        if (provStatus.success && provStatus.data) {
          const provOtp = provStatus.data.otp_code;
          if (provStatus.data.status === 'received' && isRealOtp(provOtp)) {
            // OTP sudah masuk di provider! Simpan ke DB & batalkan proses cancel
            await supabase.from('orders')
              .update({ otp_code: provOtp, status: 'received' })
              .eq('order_id', order_id);

            console.log(`[cancel] order=${order_id} OTP found during pre-cancel check: ${provOtp}`);
            return NextResponse.json({
              success: false,
              has_otp: true,
              otp_code: provOtp,
              status: 'received',
              error: 'Kode OTP sudah masuk! Pesanan tidak dapat dibatalkan.',
            }, { status: 400 });
          }
        }
      } catch (checkErr) {
        console.warn(`[cancel] check status before cancel failed for ${order_id}:`, checkErr.message);
      }

      // Cek apakah status 'received' tapi OTP kosong/tanda '-' (OTP gagal diterima)
      const otpIsEmpty = !order.otp_code || order.otp_code === '-' || order.otp_code.trim() === '';
      const isReceivedButEmpty = order.status === 'received' && otpIsEmpty;

      // Jangan bisa cancel kalau sudah selesai/canceled
      if (!['waiting', 'expiring'].includes(order.status) && !isReceivedButEmpty) {
        return NextResponse.json({
          success: false,
          error: 'Order ini sudah selesai atau dibatalkan sebelumnya.',
        }, { status: 400 });
      }

      const now = Date.now();
      const isExpired = order.expires_at && new Date(order.expires_at).getTime() <= now;

      // ── JALUR 1: ORDER EXPIRED (waktu habis) ─────────────────────────
      if (isExpired) {
        console.log(`[cancel] order=${order_id} EXPIRED → skip provider API, langsung refund`);
        return await doRefund({ supabase, user, order, order_id, reason: 'expired_timeout' });
      }

      // ── JALUR 2: SMS Bower — setStatus(8) ────────────────────────────
      const data = await cancelOrder(order_id);
      console.log(`[cancel] order=${order_id} SmsBower response=`, JSON.stringify(data));

      // EARLY_CANCEL_DENIED: SMS Bower sends this if < 2 min since order
      const isEarlyCancel = !data.success && data.message &&
        (data.message.toLowerCase().includes('belum bisa') ||
          data.message.toLowerCase().includes('early_cancel') ||
          data.message.toLowerCase().includes('2 menit'));

      if (isEarlyCancel) {
        return NextResponse.json({ success: false, error: data.message || 'Pesanan belum bisa dibatalkan.' }, { status: 400 });
      }

      const isAlreadyCanceled = !data.success && data.message &&
        (data.message.toLowerCase().includes('tidak ditemukan') ||
          data.message.toLowerCase().includes('no_activation') ||
          data.message.toLowerCase().includes('not found') ||
          data.message.toLowerCase().includes('canceled') ||
          data.message.toLowerCase().includes('expired'));

      if (data.success || isAlreadyCanceled) {
        return await doRefund({
          supabase, user, order, order_id,
          reason: isAlreadyCanceled ? 'provider_already_canceled' : 'user_manual_cancel',
          providerMessage: data.message,
        });
      }

      // Jika status 'received' tapi OTP kosong (tidak valid) — tetap refund meski provider sudah mark aktif
      if (isReceivedButEmpty) {
        console.warn(`[cancel] received-but-no-otp order=${order_id}, forcing refund despite provider response: ${data.message}`);
        return await doRefund({
          supabase, user, order, order_id,
          reason: 'received_invalid_otp',
          providerMessage: data.message,
        });
      }

      // Jika cancel gagal di provider, cek lagi apakah penyebabnya karena OTP baru saja masuk
      if (!isEarlyCancel && !isAlreadyCanceled) {
        try {
          const provCheck = await getOrderStatus(order_id, order.server || 'smsbower');
          if (provCheck.success && provCheck.data?.status === 'received' && isRealOtp(provCheck.data?.otp_code)) {
            await supabase.from('orders')
              .update({ otp_code: provCheck.data.otp_code, status: 'received' })
              .eq('order_id', order_id);

            return NextResponse.json({
              success: false,
              has_otp: true,
              otp_code: provCheck.data.otp_code,
              status: 'received',
              error: 'Kode OTP sudah masuk! Pesanan tidak dapat dibatalkan.',
            }, { status: 400 });
          }
        } catch {}
      }

      console.warn(`[cancel] FAILED order=${order_id} provider_message=${data.message}`);
      return NextResponse.json({ success: false, error: data.message || 'Gagal membatalkan pesanan di provider.' });
    }

    return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });

  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[orders/action] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Helper: lakukan refund ke user ─────────────────────────────────────────
async function doRefund({ supabase, user, order, order_id, reason, providerMessage }) {
  // Guard: cek apakah refund sudah pernah diproses sebelumnya
  const { data: existingRefund } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'refund')
    .filter('metadata->>order_id', 'eq', order_id)
    .maybeSingle();

  if (existingRefund) {
    await supabase.from('orders').update({ status: 'canceled', resend_pending: false }).eq('order_id', order_id);
    return NextResponse.json({ success: false, error: 'Refund sudah diproses sebelumnya.' }, { status: 400 });
  }

  // Atomic update status — hanya jika masih waiting/expiring/received-tanpa-OTP
  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'canceled', resend_pending: false })
    .eq('order_id', order_id)
    .in('status', ['waiting', 'expiring', 'received'])
    .select()
    .maybeSingle();

  if (updateErr || !updatedOrder) {
    return NextResponse.json({ success: false, error: 'Pesanan sudah dibatalkan atau sedang diproses.' }, { status: 400 });
  }

  // Atomic increment saldo via RPC
  const { error: rpcErr } = await supabase.rpc('increment_balance', { uid: user.id, amt: order.price });
  if (rpcErr) {
    // Rollback status agar tidak ada order canceled tanpa refund
    await supabase.from('orders').update({ status: 'waiting' }).eq('order_id', order_id);
    console.error('increment_balance RPC failed:', rpcErr);
    return NextResponse.json({ error: 'Gagal mengembalikan saldo. Hubungi admin.' }, { status: 500 });
  }

  // Catat transaksi refund
  await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'refund',
    amount: order.price,
    status: 'success',
    metadata: {
      order_id,
      reason,
      provider_message: providerMessage || null,
      server: 'smsbower',
    },
  });

  console.log(`[cancel] REFUND SUCCESS order=${order_id} Rp${order.price} reason=${reason}`);
  return NextResponse.json({ success: true, message: 'Pesanan berhasil dibatalkan dan saldo dikembalikan.' });
}
