# knowledge — Base de Conhecimento

Núcleo dono da verdade acadêmica: `Discipline`, `School`, `Theory`, `Concept`,
`AcademicPerson`, `AcademicWork`, `HistoricalPeriod`, `DevelopmentalStage`,
`Tag`, `AcademicRelation`.

Neste módulo (Fundação Técnica), existe apenas:

- `server/services/resolveEntity.ts` — esqueleto de resolução de entidade
  polimórfica (`KnowledgeEntityType` + `id`).
- `types/` — schemas Zod de `AcademicRelation`/`Citation`.

CRUD de conteúdo, curadoria e o Mapa do Conhecimento são módulos futuros.
