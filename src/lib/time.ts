/**
 * `Date.now()` isolado num módulo próprio (Módulo 11) — o linter de pureza
 * do React (`react-hooks/purity`, eslint-config-next 16) marca qualquer
 * chamada a uma função impura (`Date.now`/`Math.random`/`new Date()`)
 * escrita léxicamente dentro do corpo de um componente/hook, mesmo dentro
 * de um handler de evento. Medir `timeSpentMs` (seção 10 — dado real
 * enviado ao servidor, nunca calculado por ele no lugar do aluno) precisa
 * de um timestamp; isolar a chamada aqui, fora do escopo do componente,
 * resolve o aviso sem violar a regra nem inventar valor.
 */
export function now(): number {
  return Date.now();
}
