/** Erros de domínio explícitos do bounded context `simulation` (Módulo 6). */

export class SimulationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationValidationError";
  }
}
