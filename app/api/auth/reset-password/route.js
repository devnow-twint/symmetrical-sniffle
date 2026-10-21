import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { email, otp, password } = await request.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: 'Email, kode verifikasi, dan password baru wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Verifikasi token recovery (OTP)
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      email: cleanEmail,
      token: cleanOtp,
      type: 'recovery',
    });

    if (verifyError || !verifyData?.user) {
      return NextResponse.json(
        { error: 'Kode verifikasi (OTP) salah atau sudah kadaluarsa.' },
        { status: 400 }
      );
    }

    const userId = verifyData.user.id;
    const supabaseAdmin = getServiceSupabase();

    // Update password user di auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal memperbarui password: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui! Silakan masuk dengan password baru.',
    });
  } catch (err) {
    console.error('Error reset-password:', err);
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}
