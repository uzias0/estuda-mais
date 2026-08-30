# pedagogy — Núcleo Pedagógico

Curadoria sobre a Base de Conhecimento: `Track`, `TrackArea`, `LearningArea`,
`AreaUnit`, `Unit`, `UnitStage`, `Stage`, `StageLesson`, `Lesson`,
`LessonBlock`, `LessonKnowledgeTag`.

Módulo 4 (esta camada) tornou o domínio funcional — ver
[`docs/MODULO-4.md`](../../../docs/MODULO-4.md) para objetivo, escopo,
regras de publicação/arquivamento e decisões técnicas completas.

```
server/services/
  track.service.ts               — Track ⇄ LearningArea (TrackArea)
  learning-area.service.ts       — LearningArea ⇄ Unit (AreaUnit)
  unit.service.ts                — Unit ⇄ Stage (UnitStage)
  stage.service.ts               — Stage ⇄ Lesson (StageLesson)
  lesson.service.ts              — Lesson ⇄ conhecimento (LessonKnowledgeTag)
  lesson-block.service.ts        — LessonBlock (conteúdo + questões)
  pedagogy-publication.service.ts — gates de publicação/arquivamento centralizados
  pedagogy-query.service.ts      — consultas de leitura (trilha completa, por área/conceito/teoria/escola/dificuldade, publicadas)
  reorder.ts                     — reordenação segura, reaproveitada pelos 5 níveis
  errors.ts                      — PedagogyValidationError, ReorderError
types/
  track.schema.ts | learning-area.schema.ts | unit.schema.ts
  stage.schema.ts | lesson.schema.ts | lesson-block.schema.ts
```

Princípio que não muda: a Base de Conhecimento (`src/modules/knowledge`)
continua dona da verdade acadêmica. `Concept ≠ Lesson`, `Theory ≠ Lesson` —
uma `Lesson` referencia um nó de conhecimento (`LessonKnowledgeTag`), nunca
duplica seu conteúdo.

UI de produto, gamificação funcional, dashboard e aprendizado adaptativo
funcional continuam fora do escopo — módulos futuros.
