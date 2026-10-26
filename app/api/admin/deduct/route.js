import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const { user } = await getAuthUser(request).catch(() => { throw new Error('UNAUTHORIZED'); });
    const supabase = getServiceSupabase();

    // Verify caller is admin
    const { data: adminProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
      
    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { user_id, amount, note } = await request.json();

    const parsedAmount = parseInt(amount);
    if (!user_id || !parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'user_id dan nominal penarikan valid wajib diisi' }, { status: 400 });
    }
    
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('balance, username')
      .eq('id', user_id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (profile.balance < parsedAmount) {
      return NextResponse.json({ 
        error: `Saldo tidak mencukupi. Saldo saat ini: Rp${Number(profile.balance).toLocaleString('id-ID')}` 
      }, { status: 400 });
    }

    // Atomic decrement via RPC decrement_balance
    let { error: rpcErr } = await supabase.rpc('decrement_balance', { uid: user_id, amt: parsedAmount });
    if (rpcErr) {
      // Fallback: coba decrement via increment_balance dengan nilai negatif
      const { error: incErr } = await supabase.rpc('increment_balance', { uid: user_id, amt: -parsedAmount });
      if (incErr) {
        console.error('decrement RPC failed:', rpcErr, incErr);
        return NextResponse.json({ error: 'Gagal mengurangi saldo: ' + (incErr.message || rpcErr.message) }, { status: 500 });
      }
    }

    // Catat transaksi penarikan / pemotongan oleh admin
    await supabase.from('transactions').insert({
      user_id,
      type: 'withdraw',
      amount: parsedAmount,
      status: 'success',
      metadata: { source: 'admin_deduct', note: note || 'Penarikan/pemotongan saldo oleh admin' },
    });

    return NextResponse.json({
      success: true,
      data: { username: profile.username, deduct_amount: parsedAmount },
    });
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
