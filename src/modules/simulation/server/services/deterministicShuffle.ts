/**
 * Embaralhamento determinístico controlado por `seed` (Módulo 6, seção 8:
 * "nunca usar Math.random() diretamente em regra de negócio"). `mulberry32`
 * é um PRNG determinístico simples (mesma seed → mesma sequência sempre) —
 * usado só quando o chamador realmente quer variedade entre builds com os
 * mesmos filtros; por padrão (`seed` omitida), `DEFAULT_SHUFFLE_SEED` torna
 * a seleção 100% reproduzível.
 */

/** PRNG determinístico (mulberry32) — gera floats em [0, 1), mesma seed → mesma sequência. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates com um gerador determinístico — mesma `seed` sempre produz a mesma ordem. */
export function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
