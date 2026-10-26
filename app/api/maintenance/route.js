import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// FORCE DYNAMIC: Sangat penting agar Vercel & Next.js TIDAK me-render route ini sebagai static prerendered
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_message']);

    if (error) {
      console.error('Error fetching maintenance settings:', error);
    }

    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });

    const isMaintenance = map.maintenance_mode === 'true' || map.maintenance_mode === true;
    const message = map.maintenance_message || 'Sistem DuniaNokos sedang dalam pemeliharaan dan peningkatan performa server. Kami akan segera kembali!';

    return NextResponse.json(
      {
        success: true,
        maintenance: isMaintenance,
        message,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('Maintenance API error:', err);
    return NextResponse.json(
      {
        success: true,
        maintenance: false,
        message: '',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
