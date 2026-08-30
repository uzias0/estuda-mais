/**
 * Resolução de janela temporal para "conteúdo recente" (Módulo 7, seção 14)
 * — pura e testável, sem Prisma. Recebe `now` explícito (nunca `Date.now()`
 * implícito) para ser determinística em teste.
 */
import type { RecentWindow } from "@/modules/curation/types/current-affair.schema";

export interface DateRange {
  from: Date;
  to: Date;
}

function subDays(base: Date, days: number): Date {
  return new Date(base.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * `window="CUSTOM"` exige `from`/`to` (já validados por `DateRangeFilterSchema`
 * antes de chegar aqui — `!` é seguro). Para as janelas pré-definidas,
 * `to = now`.
 */
export function resolveWindowRange(
  window: RecentWindow,
  from: Date | undefined,
  to: Date | undefined,
  now: Date = new Date(),
): DateRange {
  switch (window) {
    case "LAST_7_DAYS":
      return { from: subDays(now, 7), to: now };
    case "LAST_30_DAYS":
      return { from: subDays(now, 30), to: now };
    case "LAST_90_DAYS":
      return { from: subDays(now, 90), to: now };
    case "CUSTOM":
      return { from: from!, to: to! };
  }
}
