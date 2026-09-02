/**
 * Manutenção pontual de conteúdo (Módulo 12) — mesmo gate de toda
 * `/admin` (`AdminLayout` já chama `requireAdminSessionActor()`, nenhuma
 * checagem própria aqui). Criada pra rodar
 * `applyAnswerLengthBiasFixes` contra o banco de PRODUÇÃO sem precisar
 * de acesso ao Shell do serviço de deploy (pedido do usuário: "não
 * tenho/não sei usar o Shell do Render") — um clique no navegador, autenticado
 * como ADMIN, em vez de um comando de terminal.
 *
 * `force-dynamic`: nenhum cache — o resultado da correção precisa ser
 * sempre lido/executado ao vivo.
 */
export const dynamic = "force-dynamic";

import { RunAnswerLengthBiasFixButton } from "@/components/admin/RunAnswerLengthBiasFixButton";
import { RunPersonPortraitsFixButton } from "@/components/admin/RunPersonPortraitsFixButton";

export default function ManutencaoPage() {
  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Manutenção de conteúdo</h1>

      <div className="card stack">
        <p className="card-title">Corrigir viés &quot;resposta mais longa = certa&quot;</p>
        <p style={{ color: "var(--color-text-muted)" }}>
          Reescreve as alternativas ERRADAS das questões que ainda tinham a alternativa correta
          sistematicamente mais longa que as demais — nenhuma alternativa muda de certa para errada,
          nenhum fato é inventado. Seguro rodar mais de uma vez (idempotente): questões já
          corrigidas aparecem como &quot;já atualizada&quot;, sem duplicar nada.
        </p>
        <RunAnswerLengthBiasFixButton />
      </div>

      <div className="card stack">
        <p className="card-title">Aplicar retratos da Biblioteca de Pessoas</p>
        <p style={{ color: "var(--color-text-muted)" }}>
          Define <code>imageUrl</code> das pessoas (Base de Conhecimento) cujo retrato já foi
          recebido e processado — mostra a ilustração real em vez de só as iniciais em
          &quot;Biblioteca → Pessoas&quot;. Seguro rodar mais de uma vez.
        </p>
        <RunPersonPortraitsFixButton />
      </div>
    </div>
  );
}
