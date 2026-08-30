/** Erros de domínio explícitos do bounded context `review` (Módulo 5). */

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewValidationError";
  }
}
