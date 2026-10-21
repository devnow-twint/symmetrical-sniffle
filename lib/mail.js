import nodemailer from 'nodemailer';
import dns from 'node:dns';
import { getServiceSupabase } from '@/lib/supabase';

dns.setDefaultResultOrder('ipv4first');

const SMTP_TIMEOUT_MS = 12000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Koneksi SMTP timeout. Silakan coba lagi.')), ms)
    ),
  ]);
}

/**
 * Mendapatkan akun SMTP Gmail dari tabel settings Supabase
 */
async function getSmtpAccount() {
  const supabase = getServiceSupabase();
  const { data: rows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['smtp_gmail_accounts', 'smtp_gmail_user', 'smtp_gmail_pass']);

  const settings = {};
  (rows || []).forEach(row => {
    settings[row.key] = row.value;
  });

  let accounts = [];
  try {
    const parsed = JSON.parse(settings.smtp_gmail_accounts || '[]');
    if (Array.isArray(parsed)) {
      accounts = parsed
        .map(a => ({
          user: String(a.user || '').trim(),
          pass: String(a.pass || '').replace(/\s/g, ''),
        }))
        .filter(a => a.user && a.pass);
    }
  } catch {}

  if (accounts.length === 0 && settings.smtp_gmail_user && settings.smtp_gmail_pass) {
    accounts.push({
      user: String(settings.smtp_gmail_user).trim(),
      pass: String(settings.smtp_gmail_pass).replace(/\s/g, ''),
    });
  }

  if (accounts.length === 0) {
    throw new Error('Konfigurasi SMTP Gmail belum tersedia di sistem.');
  }

  // Pilih satu akun secara acak
  return accounts[Math.floor(Math.random() * accounts.length)];
}

/**
 * Mengirim email menggunakan Nodemailer & SMTP Gmail
 */
export async function sendEmail({ to, subject, html, text }) {
  const smtpAccount = await getSmtpAccount();

  const configs = [
    { name: '465 SSL', host: 'smtp.gmail.com', port: 465, secure: true },
    { name: '587 TLS', host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
  ];

  const errors = [];
  for (const config of configs) {
    const transporter = nodemailer.createTransport({
      ...config,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
      tls: { servername: 'smtp.gmail.com' },
      auth: { user: smtpAccount.user, pass: smtpAccount.pass },
    });

    try {
      const info = await withTimeout(
        transporter.sendMail({
          from: `"DuniaNokos Security" <${smtpAccount.user}>`,
          to,
          subject,
          text,
          html,
        }),
        SMTP_TIMEOUT_MS + 3000
      );
      transporter.close();
      return info;
    } catch (err) {
      transporter.close();
      errors.push(`${config.name}: ${err.message}`);
    }
  }

  throw new Error(`Gagal mengirim email: ${errors.join(' | ')}`);
}

/**
 * Template khusus email Reset Password
 */
export async function sendPasswordResetEmail({ toEmail, otpCode, resetUrl }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'DuniaNokos';
  const subject = `[${appName}] Kode Verifikasi Reset Password: ${otpCode}`;

  const text = `Halo,

Kami menerima permintaan untuk mereset kata sandi akun ${appName} Anda (${toEmail}).

Gunakan kode verifikasi berikut:
${otpCode}

Atau klik tautan berikut untuk mereset langsung kata sandi Anda:
${resetUrl}

Kode ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.

Salam,
Tim ${appName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Password - ${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" style="max-width: 500px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #334155;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #00d4aa; letter-spacing: -0.5px;">${appName}</h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Pemulihan Keamanan Akun</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; color: #f8fafc; font-weight: 700;">Reset Kata Sandi Akun</h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Kami menerima permintaan untuk mereset kata sandi untuk akun <strong style="color: #00d4aa;">${toEmail}</strong>. Masukkan kode verifikasi berikut pada halaman reset password:
              </p>

              <!-- OTP Code Display -->
              <div style="margin: 24px 0; padding: 18px; background: rgba(0, 212, 170, 0.08); border: 2px dashed #00d4aa; border-radius: 12px; text-align: center;">
                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; display: block; margin-bottom: 6px;">Kode Verifikasi (OTP)</span>
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #00d4aa;">${otpCode}</span>
              </div>

              <!-- Button Direct Reset -->
              <div style="text-align: center; margin: 28px 0 20px;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #00d4aa; color: #0b1120; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);">
                  Reset Password Sekarang
                </a>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px;">
                ⏱ <strong>Catatan:</strong> Kode ini hanya berlaku selama <strong>1 jam</strong>. Jika Anda tidak pernah meminta perubahan kata sandi ini, silakan abaikan email ini secara aman.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; text-align: center; font-size: 12px; color: #64748b;">
              &copy; ${new Date().getFullYear()} ${appName}. Hak cipta dilindungi undang-undang.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to: toEmail, subject, html, text });
}
