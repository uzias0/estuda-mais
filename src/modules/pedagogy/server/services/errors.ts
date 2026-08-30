/** Erros de domínio explícitos do bounded context `pedagogy` (Módulo 4). */

export class PedagogyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PedagogyValidationError";
  }
}

/** Reordenação inválida (conjunto incompleto, duplicado, ou id estranho — ver `reorder.ts`). */
export class ReorderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReorderError";
  }
}

/**
 * Erro de domínio da execução de lição (Módulo 8) — lição não publicada,
 * bloco que não pertence à lição informada, lição ainda não iniciada,
 * conclusão tentada com blocos pendentes, etc. Deliberadamente separado de
 * `PedagogyValidationError` (que é sobre CURADORIA de conteúdo — criar/
 * editar/publicar Track/Lesson/LessonBlock): este erro é sobre USO do
 * conteúdo por um estudante.
 */
export class LessonExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonExecutionError";
  }
}
