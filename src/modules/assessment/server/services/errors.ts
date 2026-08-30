/** Erros de domínio explícitos do bounded context `assessment` (Módulo 3, seção 56). */

export class QuestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionValidationError";
  }
}

export class AttemptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttemptValidationError";
  }
}

export class DiagnosticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagnosticError";
  }
}
