import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public endpoint — no auth needed, just read deposit_open setting
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'deposit_open')
      .maybeSingle();

    if (error) throw error;

    // If row not found, default to OPEN
    const isOpen = !data || data.value === 'true';
    return NextResponse.json(
      { success: true, data: { deposit_open: isOpen } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err) {
    // On DB error (e.g. table not yet created): default CLOSED for safety
    // This prevents deposit when admin has intentionally disabled it
    console.error('[deposit-status] error:', err.message);
    return NextResponse.json(
      { success: false, data: { deposit_open: false } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}
