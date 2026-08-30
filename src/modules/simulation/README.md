# simulation — Simulados completos e desempenho acadêmico

`Simulation`, `SimulationQuestion`, `SimulationAttempt`. Módulo 6 (esta
camada) tornou o domínio funcional — ver
[`docs/MODULO-6.md`](../../../docs/MODULO-6.md) para objetivo, escopo,
fluxo de simulado, seleção determinística, desempenho, evolução,
recomendações, integração com o Módulo 5 e decisões técnicas completas.

```
server/services/
  simulation-builder.service.ts    — buildSimulation (PERSONALIZED/EXAM_EDITION/REVIEW)
  simulation.service.ts            — CRUD curatorial, publish/archive, visibilidade
  simulation-attempt.service.ts    — start/submit/finishSimulation
  simulation-grading.service.ts    — calculateSimulationResult
  simulation-performance.service.ts — breakdown (disciplina/conceito/dificuldade/tipo/prova/pedagogia) + evolução
  simulation-recommendation.service.ts — lacunas/pontos fortes + próximo simulado
  simulation-query.service.ts      — tentativas do usuário, disciplinas disponíveis
  deterministicShuffle.ts          — PRNG determinístico seedado (nunca Math.random())
  privacy.ts, errors.ts
types/
  simulation.schema.ts
```

Princípios que não mudam: nenhuma IA/LLM — toda seleção/prioridade/
recomendação é determinística e explicável. `isCorrect`/`score`/
`percentage`/`userId` nunca vêm do cliente. Correção 100% delegada a
`recordAttempt`/`gradeAnswer` (Módulo 3) — nenhum mecanismo paralelo.
Integração com revisão espaçada (Módulo 5) via `ensureReviewItem` apenas —
nunca recalcula SM-2-lite/prioridade/estado.

UI, dashboard, gamificação e módulos futuros (biblioteca, notícias, ETL)
continuam fora do escopo.
