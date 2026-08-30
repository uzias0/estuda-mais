# study-engine — motor de estudo, orquestração e recomendação determinística

Implementado no Módulo 10 (`docs/MODULO-10.md`). NÃO é uma quinta base de
dados/domínio — é uma camada de orquestração pura sobre os módulos já
existentes (`assessment`, `pedagogy`, `review`, `simulation`, `curation`,
`gamification`). Nenhuma entidade nova, nenhuma migration.

## Estrutura

```
server/
  policies/   — puro: ordenação/corte de prioridade (`priority.ts`)
  queries/    — leitura auxiliar específica de orquestração:
                localizar o diagnóstico do usuário, conceitos fracos
                "atuais", conexões interdisciplinares reais
  services/   — pontos de entrada públicos: `getStudyPlan`,
                `getNextStudyAction`, `getInitialStudyPlan`, e os
                geradores de candidato por camada da hierarquia
types/        — `NextStudyAction` (nunca persistido — sempre derivado)
```

## Autoridade de cada módulo (nunca duplicada aqui)

- Diagnóstico → Módulo 3 (`getDiagnosticResult`).
- Revisão → Módulo 5 (`getReviewQueue`).
- Lições/progresso/desbloqueio → Módulo 8 (`getNextLearningStep`).
- Questões/provas → Módulo 3/6 (`listQuestions`).
- Simulados → Módulo 6 (`getNextSimulationRecommendation`).
- Biblioteca/atualidades → Módulo 7 (`getComplementaryContentForConcept`,
  `listLibraryByDiscipline`, `getCurrentAffairsByDiscipline`).
- Interdisciplinaridade → Módulo 2 (`AcademicRelation`/
  `listRelationsForEntity`) — só relações PUBLICADAS reais, nunca inventadas.
- Gamificação → Módulo 9 (contexto apenas — nunca escrito por este módulo).

Sem IA/LLM, sem UI, sem rotas HTTP — só domínio.
