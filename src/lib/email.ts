import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "Tiffy Social <onboarding@resend.dev>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getBaseUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verifique seu email - Tiffy Social",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #000; color: #fff; padding: 32px; border-radius: 16px;">
        <h1 style="text-align: center; font-size: 28px; margin-bottom: 8px;">Tiffy Social</h1>
        <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-bottom: 32px;">Confirme seu email</p>

        <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
          Bem-vindo(a) a Tiffy Social! Clique no botao abaixo para verificar seu email e ativar sua conta:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background: #a855f7; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Verificar Email
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
          Este link expira em 24 horas. Se voce nao criou uma conta na Tiffy Social, ignore este email.
        </p>

        <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;" />
        <p style="font-size: 12px; color: #4b5563; text-align: center;">
          Tiffy Social - Conecte-se e compartilhe momentos especiais
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Recuperar sua senha - Tiffy Social",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #000; color: #fff; padding: 32px; border-radius: 16px;">
        <h1 style="text-align: center; font-size: 28px; margin-bottom: 8px;">Tiffy Social</h1>
        <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-bottom: 32px;">Recuperacao de senha</p>

        <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
          Voce solicitou a recuperacao da sua senha. Clique no botao abaixo para criar uma nova senha:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #ec4899; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Redefinir Senha
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
          Este link expira em 1 hora. Se voce nao solicitou a recuperacao de senha, ignore este email.
        </p>

        <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;" />
        <p style="font-size: 12px; color: #4b5563; text-align: center;">
          Tiffy Social - Conecte-se e compartilhe momentos especiais
        </p>
      </div>
    `,
  });
}
