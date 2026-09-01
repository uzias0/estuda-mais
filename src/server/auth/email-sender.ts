/**
 * Porta de envio de e-mail (etapa de fechamento, seção 10: "recuperação de
 * senha"). `RESEND_API_KEY` (env var, opcional) decide o comportamento:
 * ausente → só registra o link em log de servidor (nunca lança, nunca
 * bloqueia o fluxo); presente → envia de verdade via Resend
 * (https://resend.com), chamado direto por `fetch` na API REST deles —
 * sem SDK novo como dependência (a API é só um POST JSON simples, mesma
 * decisão de "sem dependência nova só para isto" já usada em
 * `src/server/auth/password.ts`/`totp.ts`).
 *
 * Sem domínio verificado no painel do Resend, o remetente padrão deles
 * (`onboarding@resend.dev`) só entrega para o e-mail da PRÓPRIA conta
 * Resend usada para gerar a chave — limitação do Resend, não deste
 * projeto (documentado para não prometer entrega a qualquer aluno sem um
 * domínio configurado).
 */

export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

/** `true` quando há uma chave de API real configurada — só usado para o aviso de log ficar honesto sobre o estado real do sistema. */
export const EMAIL_PROVIDER_CONFIGURED: boolean = Boolean(process.env.RESEND_API_KEY);

const RESEND_FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? "Estuda+ <onboarding@resend.dev>";

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email-sender] Nenhum provedor de e-mail configurado — o link de redefinição de senha ` +
        `para "${to}" NÃO foi enviado por e-mail de verdade. Link (válido por tempo limitado): ${resetUrl}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_ADDRESS,
      to: [to],
      subject: "Redefinição de senha — Estuda+",
      html:
        `<p>Você pediu para redefinir sua senha no Estuda+.</p>` +
        `<p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>` +
        `<p>Se não foi você quem pediu, pode ignorar este e-mail.</p>`,
    }),
  });

  if (!response.ok) {
    // Nunca lança para o fluxo de "esqueci minha senha" (que sempre resolve
    // com sucesso, mesma regra de `password-reset.service.ts`) — só loga o
    // problema real do provedor, para diagnóstico, sem revelar nada ao
    // usuário nem travar a recuperação (o token continua válido; o
    // servidor tenta de novo se o usuário pedir outro link).
    const body = await response.text().catch(() => "");
    console.error(
      `[email-sender] Resend recusou o envio para "${to}" (status ${response.status}): ${body}`,
    );
  }
}
