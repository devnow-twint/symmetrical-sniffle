import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Dapatkan origin aplikasi (e.g. http://localhost:3000 atau https://domain.com)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const origin = request.headers.get('origin') || `${proto}://${host}`;

    // Gunakan client Supabase untuk memicu email bawaan Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
        return NextResponse.json(
          { error: 'Terlalu sering meminta reset password. Silakan tunggu sekitar 1 menit lalu coba lagi.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Gagal mengirim email reset password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email pemulihan kata sandi telah dikirim oleh Supabase. Silakan periksa kotak masuk atau spam email Anda.',
    });
  } catch (err) {
    console.error('Error forgot-password:', err);
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}
