import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(
  to: string,
  username: string,
  resetLink: string
) {
  await transporter.sendMail({
    from: `"Armtech App" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your Armtech password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px">Hi <strong>${username}</strong>, we received a request to reset your password for your Armtech account.</p>
        <a href="${resetLink}" style="display:inline-block;background:#6B6CF2;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;margin-top:24px">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">Armtech — Innovation and Excellence</p>
      </div>
    `,
  });
}

export async function sendPasswordChangedEmail(to: string, username: string) {
  await transporter.sendMail({
    from: `"Armtech App" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Armtech password was changed',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Password changed</h2>
        <p style="color:#555">Hi <strong>${username}</strong>, your Armtech account password was just changed.</p>
        <p style="color:#555">If you made this change, no action is needed.</p>
        <p style="color:#e53e3e;font-weight:600">If you did NOT make this change, contact your administrator immediately.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">Armtech — Innovation and Excellence</p>
      </div>
    `,
  });
}
