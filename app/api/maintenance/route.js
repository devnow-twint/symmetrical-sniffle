import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// In-memory cache agar hemat database
let _mCache = null; // { maintenance: boolean, message: string, ts: number }
const CACHE_TTL_MS = 5000; // 5 detik

export async function GET() {
  try {
    if (_mCache && Date.now() - _mCache.ts < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        maintenance: _mCache.maintenance,
        message: _mCache.message,
      });
    }

    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_message']);

    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });

    const isMaintenance = map.maintenance_mode === 'true' || map.maintenance_mode === true;
    const message = map.maintenance_message || 'Sistem sedang dalam pemeliharaan dan peningkatan server. Kami akan segera kembali!';

    _mCache = {
      maintenance: isMaintenance,
      message,
      ts: Date.now(),
    };

    return NextResponse.json({
      success: true,
      maintenance: isMaintenance,
      message,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      maintenance: false,
      message: '',
    });
  }
}
