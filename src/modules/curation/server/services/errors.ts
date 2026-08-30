/** Erros de domínio do Módulo 7 (biblioteca/atualidades) — distintos de `PublicationPolicyError` (Módulo 2, gate de Citation). */

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}
