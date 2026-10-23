import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { setBlacklistCache, clearPriceCache, getPricesListV3 } from '@/lib/otpProvider';

// GET /api/admin/blacklist — ambil daftar ID ter-blacklist atau inspect provider per negara+layanan
export async function GET(request) {
  try {
    const { user } = await getAuthUser(request).catch(() => { throw new Error('UNAUTHORIZED'); });
    const supabase = getServiceSupabase();

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const inspect = searchParams.get('inspect');
    const service = searchParams.get('service');
    const country = searchParams.get('country');

    // Jika admin ingin melihat semua provider aktif & stok untuk suatu layanan & negara
    if (inspect === '1' && service && country) {
      const result = await getPricesListV3(service, country, { includeBlacklisted: true });
      return NextResponse.json(result);
    }

    const { data: row } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'blacklisted_provider_ids')
      .maybeSingle();

    let list = [];
    if (row && row.value) {
      try {
        list = JSON.parse(row.value);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = String(row.value).split(/[,\s]+/).filter(Boolean);
      }
    }

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/blacklist — tambah, hapus, atau kelola daftar blacklist
export async function POST(request) {
  try {
    const { user } = await getAuthUser(request).catch(() => { throw new Error('UNAUTHORIZED'); });
    const supabase = getServiceSupabase();

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action = 'add', id, ids, list: incomingList } = body;

    // Ambil list sekarang dari DB
    const { data: row } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'blacklisted_provider_ids')
      .maybeSingle();

    let current = [];
    if (row && row.value) {
      try {
        current = JSON.parse(row.value);
        if (!Array.isArray(current)) current = [];
      } catch {
        current = String(row.value).split(/[,\s]+/).filter(Boolean);
      }
    }
    let currentSet = new Set(current.map(x => String(x).trim()).filter(Boolean));

    let actionMsg = 'Blacklist berhasil diperbarui';

    if (action === 'add') {
      const itemsToAdd = [];
      if (ids && Array.isArray(ids)) {
        itemsToAdd.push(...ids);
      } else if (id) {
        itemsToAdd.push(id);
      }

      const addedList = [];
      itemsToAdd.forEach(item => {
        String(item)
          .split(/[,\s]+/)
          .forEach(part => {
            const trimmed = part.trim();
            if (trimmed) {
              currentSet.add(trimmed);
              addedList.push(trimmed);
            }
          });
      });
      actionMsg = addedList.length > 0
        ? `Provider ID ${addedList.join(', ')} berhasil ditambahkan ke blacklist`
        : 'Tidak ada ID yang ditambahkan';
    } else if (action === 'remove') {
      const toRemove = String(id).trim();
      currentSet.delete(toRemove);
      actionMsg = `Provider ID ${toRemove} berhasil dihapus dari blacklist`;
    } else if (action === 'clear') {
      currentSet.clear();
      actionMsg = 'Semua blacklist provider ID berhasil dibersihkan';
    } else if (action === 'set') {
      currentSet = new Set((incomingList || []).map(x => String(x).trim()).filter(Boolean));
      actionMsg = 'Daftar blacklist berhasil diperbarui';
    }

    const updatedList = Array.from(currentSet);

    // Simpan ke DB tabel settings
    const { error: upsertErr } = await supabase
      .from('settings')
      .upsert({
        key: 'blacklisted_provider_ids',
        value: JSON.stringify(updatedList),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (upsertErr) throw upsertErr;

    // Update in-memory cache dan flush price cache
    setBlacklistCache(updatedList);
    clearPriceCache();

    console.log(`[admin/blacklist] updated by user=${user.id}:`, updatedList);

    return NextResponse.json({
      success: true,
      message: actionMsg,
      data: updatedList,
    });
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[admin/blacklist] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
