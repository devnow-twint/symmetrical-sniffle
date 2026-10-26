import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { getOrderStatus } from '@/lib/otpProvider';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const order_id = searchParams.get('order_id');
  const server = searchParams.get('server') || 'server3';

  if (!order_id) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  try {
    // Auth check — prevent unauthenticated access to order status
    const { user } = await getAuthUser(request).catch(() => { throw new Error('UNAUTHORIZED'); });

    const supabase = getServiceSupabase();

    // Single query — ambil semua field sekaligus (user_id, server, price, status)
    // Sebelumnya 2 query terpisah → sekarang 1 query, hemat 1 DB round-trip per polling
    const { data: orderRow } = await supabase
      .from('orders').select('user_id, server, price, status, otp_code, otp_codes, otp_text, resend_pending, expires_at').eq('order_id', order_id).single();
    if (!orderRow || orderRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    // Cek status dari data yang sudah diambil — jangan poll provider kalau sudah final
    const currentOrder = {
      status: orderRow.status,
      otp_code: orderRow.otp_code,
      otp_codes: orderRow.otp_codes,
      otp_text: orderRow.otp_text,
      resend_pending: orderRow.resend_pending,
    };

    // ── Resend SMS: order 'received' yang sedang menunggu kode ke-2 ─────────────
    if (orderRow.status === 'received' && orderRow.resend_pending) {
      // Jika waktu aktivasi sudah habis (>25 menit), matikan resend_pending dan stop polling
      const isExpired = orderRow.expires_at && new Date(orderRow.expires_at).getTime() <= Date.now();
      if (isExpired) {
        await supabase.from('orders')
          .update({ resend_pending: false })
          .eq('order_id', order_id);
        return NextResponse.json({
          success: true,
          data: { ...currentOrder, resend_pending: false },
        });
      }

      const prov = await getOrderStatus(order_id, orderRow.server || server);
      const known = Array.isArray(orderRow.otp_codes) ? orderRow.otp_codes : [];
      const resendData = {
        status: 'received',
        otp_code: orderRow.otp_code,
        otp_codes: known,
        otp_text: orderRow.otp_text,
        resend_pending: true,
      };
      if (prov.success && prov.data.status === 'received' && prov.data.otp_code && prov.data.otp_code !== '-'
          && !known.includes(prov.data.otp_code)) {
        const newCodes = [...known, prov.data.otp_code];
        await supabase.from('orders')
          .update({ otp_code: prov.data.otp_code, otp_codes: newCodes, resend_pending: false })
          .eq('order_id', order_id)
          .eq('status', 'received');
        Object.assign(resendData, { otp_code: prov.data.otp_code, otp_codes: newCodes, resend_pending: false });
      }
      return NextResponse.json({ success: true, data: resendData });
    }

    if (!['waiting', 'expiring'].includes(orderRow.status)) {
      // Order already finalized (canceled/completed/received) — skip provider poll
      if (orderRow.resend_pending) {
        await supabase.from('orders').update({ resend_pending: false }).eq('order_id', order_id);
      }
      return NextResponse.json({ success: true, data: { ...currentOrder, resend_pending: false } });
    }

    // CRITICAL: Use server from DB, not from query param
    const orderServer = orderRow.server || server;
    const data = await getOrderStatus(order_id, orderServer);

    if (data.success) {
      if (data.data.status === 'received' && data.data.otp_code && data.data.otp_code !== '-') {
        // OTP masuk — simpan kode dan tandai received
        await supabase.from('orders')
          .update({ otp_code: data.data.otp_code, otp_codes: [data.data.otp_code], status: 'received' })
          .eq('order_id', order_id)
          .in('status', ['waiting', 'expiring']);

      } else if (data.data.status === 'canceled') {
        // ── PROVIDER CANCELED → refund saldo (atomic, idempotent) ──────
        // Guard: cek apakah refund sudah pernah diproses untuk order ini
        const { data: existingRefund } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'refund')
          .filter('metadata->>order_id', 'eq', order_id)
          .maybeSingle();

        if (!existingRefund) {
          // Atomic update status — hanya jika masih waiting/expiring
          const { data: updatedOrder } = await supabase
            .from('orders')
            .update({ status: 'canceled', otp_code: null })
            .eq('order_id', order_id)
            .in('status', ['waiting', 'expiring'])
            .select()
            .maybeSingle();

          if (updatedOrder) {
            // Atomic increment saldo via RPC
            const { error: rpcErr } = await supabase.rpc('increment_balance', {
              uid: user.id,
              amt: orderRow.price,
            });

            if (rpcErr) {
              // Rollback status agar tidak ada order canceled tanpa refund
              await supabase.from('orders').update({ status: 'waiting' }).eq('order_id', order_id);
              console.error('[status-poll] increment_balance RPC failed:', rpcErr);
            } else {
              // Catat transaksi refund
              await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'refund',
                amount: orderRow.price,
                status: 'success',
                metadata: {
                  order_id,
                  reason: 'provider_auto_canceled',
                  provider_message: 'Provider canceled during status poll',
                  server: 'smsbower',
                },
              });
              console.log(`[status-poll] REFUND SUCCESS order=${order_id} Rp${orderRow.price} reason=provider_auto_canceled`);
            }
          }
        } else {
          // Refund sudah ada, pastikan status tetap canceled
          await supabase.from('orders')
            .update({ status: 'canceled', otp_code: null })
            .eq('order_id', order_id)
            .in('status', ['waiting', 'expiring']);
          console.log(`[status-poll] order=${order_id} refund already exists, just updating status`);
        }

      } else {
        // Masih menunggu OTP — HANYA update DB jika status/otp_code berubah
        // Mencegah redundant write DB & broadcast Realtime berulang setiap polling (sangat menghemat Supabase compute/WAL)
        if (orderRow.status !== 'waiting' || (orderRow.otp_code && orderRow.otp_code !== '-')) {
          await supabase.from('orders')
            .update({ otp_code: null, status: 'waiting' })
            .eq('order_id', order_id)
            .in('status', ['waiting', 'expiring']);
        }
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

