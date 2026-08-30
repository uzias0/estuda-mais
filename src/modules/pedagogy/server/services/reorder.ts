/**
 * Reordenação segura (Módulo 4, capacidade 11) — troca o `order` de TODOS os
 * filhos de um pai pedagógico de uma vez (Track→areas, LearningArea→units,
 * Unit→stages, Stage→lessons, Lesson→blocks), nunca item a item isolado.
 *
 * Exige que a lista recebida seja exatamente o mesmo conjunto de ids já
 * vinculado — sem omissão, sem duplicata, sem id estranho. Isso evita uma
 * reordenação parcial que deixaria `order` inconsistente (dois filhos com a
 * mesma posição) ou um filho "esquecido" fora da lista. Quem chama isto
 * ainda precisa aplicar a nova ordem numa transação (`prisma.$transaction`)
 * — esta função só valida a entrada, não persiste nada.
 */
import { ReorderError } from "./errors";

export function assertValidReorder(currentIds: string[], orderedIds: string[]): void {
  if (orderedIds.length !== currentIds.length) {
    throw new ReorderError(
      `Reordenação exige a lista completa: esperado ${currentIds.length} item(ns), recebido ${orderedIds.length}.`,
    );
  }

  const orderedSet = new Set(orderedIds);
  if (orderedSet.size !== orderedIds.length) {
    throw new ReorderError("Reordenação não pode conter ids duplicados.");
  }

  const currentSet = new Set(currentIds);
  for (const id of orderedIds) {
    if (!currentSet.has(id)) {
      throw new ReorderError(`Id "${id}" não pertence a este conjunto e não pode ser reordenado.`);
    }
  }
}
