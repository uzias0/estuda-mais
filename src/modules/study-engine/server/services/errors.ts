/** Erros de domínio explícitos do bounded context `study-engine` (Módulo 10). */

/** Referência inválida passada a uma consulta do motor de estudo (ex.: escopo/trilha que não existe). */
export class StudyEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyEngineValidationError";
  }
}
