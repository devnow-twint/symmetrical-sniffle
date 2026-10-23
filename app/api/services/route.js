import { NextResponse } from 'next/server';
import { getServices, setRateCache, setBlacklistCache } from '@/lib/otpProvider';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const negara = searchParams.get('negara');

  try {
    // ── Selalu baca kurs & blacklist terbaru dari DB sebelum hitung harga ──
    const supabase = getServiceSupabase();
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['usd_to_idr', 'otp_price_markup', 'blacklisted_provider_ids']);
    const map = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
    const usdToIdr = parseFloat(map.usd_to_idr || process.env.USD_TO_IDR || '16000');
    const markup   = parseFloat(map.otp_price_markup || process.env.OTP_PRICE_MARKUP || '1.5');
    // Seed in-memory cache dengan nilai DB terbaru (satu process ini)
    setRateCache(usdToIdr, markup);

    if (map.blacklisted_provider_ids) {
      try {
        const bl = JSON.parse(map.blacklisted_provider_ids);
        if (Array.isArray(bl)) setBlacklistCache(bl);
      } catch {
        const bl = String(map.blacklisted_provider_ids).split(/[,\s]+/).filter(Boolean);
        setBlacklistCache(bl);
      }
    }

    const data = await getServices(negara, 'smsbower');

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' }, // jangan cache — harga harus selalu fresh
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
