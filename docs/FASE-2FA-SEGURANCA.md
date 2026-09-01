# Fase "Segurança de Conta" — 2FA, Confirmar Senha, E-mail Real

> Pedido do usuário: "preciso na hora de criar uma conta, ter verificação
> de dois fatores... preciso confirmar a senha duas vezes... preciso saber
> se o link de verificação está funcionando mesmo".

## O que foi entregue

### 1. Autenticação de dois fatores (TOTP)

- Implementado à mão sobre `crypto.createHmac` (RFC 6238/4226) —
  `src/server/auth/totp.ts`, testado contra os **vetores oficiais da RFC
  6238** (não só "parece certo"). Mesma decisão de `password.ts`: sem
  dependência nova.
- Compatível com qualquer app autenticador padrão (Google Authenticator,
  Authy, 1Password, Aegis...).
- Fluxo: `beginTwoFactorSetup` (gera segredo, NÃO ativa) →
  `confirmTwoFactorSetup` (só ativa com um código real, gera 10 códigos de
  recuperação de uso único) → gerenciável em Perfil, exige senha atual
  para desativar.
- No login: senha certa + 2FA ativado → desafio pendente
  (`TwoFactorChallenge`, uso único, expira em 10 min) → só o código certo
  (TOTP OU um código de recuperação) cria a sessão de verdade.
- **Sem QR code de imagem nesta entrega** — o segredo aparece como texto
  para digitação manual no app autenticador (gerar QR de verdade exige um
  encoder próprio, um algoritmo grande demais para valer a pena hand-roll
  só para isto — decisão documentada, pode virar uma próxima entrega).

### 2. Confirmar senha duas vezes (cadastro)

`SignUpForm.tsx` ganhou um campo "Confirme a senha" — validação
client-side (nunca enviado ao servidor, `signUpAction` continua recebendo
exatamente o mesmo payload de sempre). Bloqueia o envio com uma mensagem
clara se as duas senhas não baterem.

### 3. E-mail real de recuperação de senha (Resend)

- Usuário criou uma conta gratuita no Resend e forneceu a chave de API.
- `email-sender.ts` reescrito: chama a API REST do Resend direto via
  `fetch` (sem SDK novo como dependência) quando `RESEND_API_KEY` está
  configurada; continua só logando o link (nunca quebra o fluxo) quando
  não está.
- **Confirmado funcionando de verdade**: chamada real à API do Resend
  autenticou corretamente com a chave fornecida (erro 403 recebido foi de
  RESTRIÇÃO DE DESTINATÁRIO — sandbox do Resend só entrega para o e-mail
  da própria conta até um domínio ser verificado —, não de autenticação).
- **Pendente do lado do usuário**: verificar um domínio próprio no painel
  do Resend para enviar e-mail a qualquer aluno real (hoje só chega no
  e-mail da conta Resend usada para gerar a chave).
- `RESEND_API_KEY` já está no `.env` local (nunca commitado — `.env` é
  ignorado pelo git). **Ainda falta configurar a mesma variável no painel
  do Render** para funcionar em produção — variável de ambiente local
  nunca é enviada ao servidor de produção.

## Verificação

- `src/server/auth/totp.test.ts` (15 testes, incluindo os 5 vetores
  oficiais da RFC 6238).
- `src/modules/auth/server/services/two-factor.service.test.ts` (8
  testes) — inclui um bug real encontrado e corrigido durante os testes
  (canonicalização de código de recuperação: hash usava a forma sem
  traço, mas a verificação comparava com o traço — corrigido).
- `auth.service.test.ts` estendido (+2 testes): desafio de 2FA no login,
  idempotência de uso único, código de recuperação como alternativa.
- 111 arquivos / 674 testes passando, typecheck e lint limpos.
- **Verificado ao vivo, ponta a ponta**: cadastro com confirmação de
  senha (erro real de "senhas diferentes" reproduzido), ativação de 2FA
  (segredo → código real gerado localmente → confirmado → 10 códigos de
  recuperação mostrados), logout, login com senha certa (desafio de 2FA
  aparece, sem sessão criada), código errado rejeitado, login concluído
  com um código de recuperação real, e a chamada real à API do Resend
  (autenticação confirmada, só restrita por domínio não verificado).

## Pendências para o usuário

1. Verificar um domínio no Resend, se quiser e-mail chegando para
   qualquer aluno (não só a própria conta Resend).
2. Adicionar `RESEND_API_KEY` nas variáveis de ambiente do Render
   (produção) — sem isso, produção continua só logando o link.
