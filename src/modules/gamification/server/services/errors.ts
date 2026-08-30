/** Erros de domínio explícitos do bounded context `gamification` (Módulo 9). */

/**
 * Falha de validação de um evento de gamificação — referência inexistente,
 * evento ainda não concluído no módulo de origem, ou payload que tenta
 * forjar um resultado que só o servidor pode calcular.
 */
export class GamificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GamificationValidationError";
  }
}
