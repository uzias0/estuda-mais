/**
 * Limitador de taxa em memória — endurecimento mínimo de produção pedido na
 * etapa de fechamento (seção 10: "rate limiting apropriado para
 * login/cadastro"). Documentado como limitação desde
 * `docs/FINALIZACAO-PROJETO.md` § 11/12 ("sem rate limiting"); esta é a
 * mitigação de nível de APLICAÇÃO possível sem inventar infraestrutura
 * externa (Redis, serviço de borda) que não existe no ambiente — não
 * substitui um rate limiting na borda/proxy em produção real (recomendado,
 * fora do escopo de código de aplicação), mas bloqueia o caso óbvio de força
 * bruta/flood de um único processo Node.
 *
 * Janela fixa por chave (`ação:identificador`, ex.: `signIn:email@x.com`) —
 * simples e suficiente para o volume atual; NÃO é distribuído (não
 * compartilha estado entre instâncias/processos) e é perdido a cada reinício
 * do processo. Ambos os limites são intencionalmente por identificador (não
 * por IP): protege a conta específica visada (o risco real de força bruta de
 * senha), sem depender de `x-forwarded-for` — que só é confiável atrás de um
 * proxy configurado corretamente, o que este ambiente não garante.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Consome uma tentativa para `key`. Lança `RateLimitError` quando o limite
 * da janela atual foi excedido; caso contrário, apenas incrementa o contador.
 */
export function consumeRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= max) {
    throw new RateLimitError();
  }

  existing.count += 1;
}

/** Só para testes — limpa todo o estado em memória entre cenários. */
export function __resetRateLimits(): void {
  buckets.clear();
}
