/**
 * Porta de envio de e-mail (etapa de fechamento, seção 10: "recuperação de
 * senha"/"verificação de e-mail, se compatível com a infraestrutura
 * atual"). Este ambiente NÃO tem um provedor de e-mail transacional
 * configurado (Resend/SendGrid/SES/SMTP) — em vez de inventar um serviço
 * falso que finge enviar e-mails, esta implementação PADRÃO só registra o
 * link em log de servidor (nunca lança, nunca bloqueia o fluxo) e deixa
 * claro, em tempo de execução, que nenhum e-mail real foi entregue.
 *
 * Para produção: implemente `sendPasswordResetEmail` chamando o SDK/API do
 * provedor escolhido (ex.: Resend `emails.send(...)`) e troque a
 * exportação abaixo — nenhum outro arquivo precisa mudar, pois
 * `password-reset.service.ts` só depende desta assinatura de função.
 */

export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

/**
 * Implementação padrão (dev/sem provedor configurado): loga o link em vez
 * de enviar. `EMAIL_PROVIDER_CONFIGURED` fica `false` até uma implementação
 * real ser conectada — usado só para o aviso de log ficar honesto sobre o
 * estado real do sistema, nunca para bloquear o fluxo de recuperação de
 * senha (o token continua sendo gerado e válido mesmo sem e-mail real).
 */
export const EMAIL_PROVIDER_CONFIGURED = false;

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailParams): Promise<void> {
  if (!EMAIL_PROVIDER_CONFIGURED) {
    console.warn(
      `[email-sender] Nenhum provedor de e-mail configurado — o link de redefinição de senha ` +
        `para "${to}" NÃO foi enviado por e-mail de verdade. Link (válido por tempo limitado): ${resetUrl}`,
    );
    return;
  }
  // Caminho real (produção): plugar aqui o SDK do provedor escolhido.
}
