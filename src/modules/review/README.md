# review — Revisão espaçada e aprendizagem adaptativa (determinística)

`ReviewItem`, `ReviewState`, `ReviewLog`. Módulo 5 (esta camada) tornou o
domínio funcional — ver [`docs/MODULO-5.md`](../../../docs/MODULO-5.md)
para objetivo, escopo, algoritmo, cálculo de prioridade, segurança e
decisões técnicas completas.

```
types/
  review-item.schema.ts       — já existia (Módulo 1): CHECK scope/questionId/conceptId
  review-session.schema.ts    — EnsureReviewItemInputSchema, SubmitReviewAnswerInputSchema
server/services/
  spacedRepetition.ts          — PURA: algoritmo "SM-2-lite" (acerto/erro/dificuldade)
  reviewPriority.ts            — PURA: score de prioridade + justificativa textual
  reviewContext.ts             — ponte com dados reais (erro, dificuldade, lacuna, pedagogia, escolha de questão)
  privacy.ts                   — assertOwnReviewDataOrAdmin (guarda de privacidade)
  errors.ts                    — ReviewValidationError
  reviewItem.service.ts        — ensureReviewItem, suspend/resumeReviewItem, get/list
  reviewQueue.service.ts       — getReviewQueue (filtros + ordenação por prioridade)
  reviewSession.service.ts     — start/submit/finishReviewSession, getReviewSessionSummary
  reviewPerformance.service.ts — getReviewPerformance
  reviewRecommendation.service.ts — getReviewRecommendations
  reviewDiagnosticBridge.service.ts — enqueueWeakConceptsFromDiagnostic (Módulo 3)
```

Princípios que não mudam: nenhuma IA/LLM — toda prioridade/recomendação é
uma fórmula determinística sobre `dueAt`/histórico/dificuldade reais,
sempre explicável. `isCorrect`/`nextReviewAt`/`priority`/`state`/`userId`
nunca vêm do cliente — sempre recalculados pelo servidor. Reaproveita
`StudySession`(mode=REVISAO)/`QuestionAttempt`(context=REVIEW) do Módulo 3
como sessão e correção — nenhuma entidade paralela.

UI, dashboard, gamificação funcional e aprendizagem adaptativa por IA
continuam fora do escopo — módulos futuros.
