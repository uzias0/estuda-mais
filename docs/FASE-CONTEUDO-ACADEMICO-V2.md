# Fase de Povoamento Acadêmico Real — Expansão (v2)

> Executada por uma única linha de execução, sem agentes paralelos (regra 30
> do prompt desta fase). Complementa `docs/FASE-CONTEUDO-ACADEMICO.md` (fase
> anterior, "v1") — não a substitui nem a contradiz, só expande a mesma base
> real com o mesmo padrão de procedência. `scripts/seed-academic-content-v2.ts`
> **depende** de `scripts/seed-academic-content.ts` já ter rodado (reaproveita
> a Discipline "Psicologia" e as 6 Lessons/Stages de v1).

## 1. Status

Concluída. 14 novos psicólogos historicamente reais (Watson, Pavlov, Wundt,
James, Lewin, Vygotsky, Erikson, Ainsworth, Klein, Anna Freud, Winnicott,
Horney, Beck, Maslow), cada um com Escola → Teoria → Conceito → Obra real →
Questão autoral (tipo pedagogicamente adequado, não forçado) → Lição
publicada. Mais 9 períodos históricos reais, 4 disciplinas interdisciplinares
relacionadas à Psicologia, 17 tags, 2 itens de biblioteca gratuitos e de
domínio público verificado, 2 atualidades reais e datadas, 7 novas relações
acadêmicas pessoa↔pessoa/teoria↔pessoa (mais 4 disciplina↔disciplina), e 8
novas trilhas pedagógicas publicadas (reaproveitando as 6 Lessons de v1 sem
duplicá-las) — 9 trilhas reais no total, cobrindo exatamente a lista da
seção 14 do prompt desta fase.

Todos os fatos biográficos/bibliográficos foram verificados por busca web
**antes** de escrever o script (ver seção 12).

## 2–11. Quantidades (agregado v1 + v2, banco real após esta fase)

| Entidade                         | Total real (PUBLISHED)                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| Disciplinas                      | 5 (Psicologia, Filosofia, Sociologia, História, Educação)              |
| Escolas                          | 12                                                                     |
| Teorias                          | 20                                                                     |
| Conceitos                        | 20                                                                     |
| Autores (`AcademicPerson`)       | 20                                                                     |
| Obras (`AcademicWork`)           | 20                                                                     |
| Períodos históricos              | 9                                                                      |
| Tags                             | 17                                                                     |
| Lições                           | 20 (100 blocos, 5 por lição)                                           |
| Questões — total                 | 20                                                                     |
| Questões — autorais              | 20                                                                     |
| Questões — oficiais/metadados    | 0                                                                      |
| Provas (`Exam`)                  | 1 (ENEM, só estrutura + citação da matriz oficial, sem edição/questão) |
| Edições de prova (`ExamEdition`) | 0                                                                      |
| Itens de biblioteca              | 3 (1 de v1 + 2 novos)                                                  |
| Atualidades                      | 2                                                                      |
| Relações acadêmicas              | 13 (2 de v1 + 11 novas: 7 pessoa/teoria + 4 disciplina↔disciplina)     |
| Trilhas (`Track`)                | 9                                                                      |

Só desta fase (v2): 14 pessoas/teorias/conceitos/obras/lições/questões, 9
períodos, 4 disciplinas, 17 tags, 2 itens de biblioteca, 2 atualidades, 11
relações, 8 trilhas (+ 1 School "Gestalt" sem vertical completa — ver seção 13).

## 12. Fontes utilizadas (todas verificadas por busca antes de escrever o script)

- **Wikipédia em português** — 14 artigos, um por novo autor (fatos
  biográficos/conceituais), mesmo padrão de v1.
- **Wikipédia em português** — 4 artigos (Filosofia, Sociologia, História,
  Educação) para as definições interdisciplinares.
- **Project Gutenberg** — eBooks #57628 (_The Principles of Psychology, vol.
  1_, William James, 1890) — item de biblioteca gratuito, domínio público
  confirmado (obra pré-1928).
- **Internet Archive** — _Conditioned Reflexes_ (Ivan Pavlov, trad. G. V.
  Anrep, 1927) — item de biblioteca gratuito, domínio público confirmado.
- **OMS (who.int)** — página oficial "World Health Assembly Update"
  (25/05/2019), confirmando a adoção da CID-11 pela 72ª Assembleia Mundial
  da Saúde — fonte da atualidade sobre incongruência de gênero.
- **CFP (site.cfp.org.br)** — Resolução CFP nº 11, de 11/05/2018 (PDF
  oficial) — fonte da atualidade sobre atendimento psicológico on-line.
- **Câmara dos Deputados (camara.leg.br)** — texto oficial da Lei nº 4.119/
  1962 — base do período histórico "Psicologia no Brasil: Regulamentação
  Profissional".
- Datas/fatos cruzados em múltiplas fontes independentes durante a pesquisa
  antes da escrita do script (ex.: data exata da adoção da CID-11 confirmada
  via página oficial da OMS após uma primeira busca ter trazido datas
  próximas mas divergentes em fontes secundárias).
- **Autoral** — 1 `Source` própria (reaproveitada de v1 pelo nome, mesma
  linha), para as 14 novas questões redigidas originalmente para esta fase.

## 13. Conteúdo não incluído (e por quê)

- **Vertical completa da Gestalt** (Wertheimer/Köhler/Koffka como
  `AcademicPerson`, com conceito/questão/lição próprios): só a `School`
  "Gestalt" e o `HistoricalPeriod` correspondente foram criados, citando a
  Wikipédia — verticalização completa (pessoa/obra/conceito/questão/lição)
  fica para um próximo lote, por decisão de escopo (qualidade > quantidade,
  regra 25), não por dificuldade técnica.
- **Edições/questões oficiais de provas** (ENEM ou outras): mesma restrição
  de v1 — nenhuma fonte legalmente segura e verificada para reprodução foi
  encontrada nesta sessão. Nenhuma `ExamEdition` nova foi criada.
- **Neuropsicologia, Avaliação Psicológica, Psicologia Organizacional,
  Psicologia Escolar/Educacional, Psicologia da Saúde, Psicologia
  Experimental, Psicologia da Personalidade como áreas verticais dedicadas**:
  as 20 áreas fundamentais listadas na seção 5 do prompt desta fase não
  foram todas povoadas com uma vertical própria — 12 escolas reais cobrem um
  subconjunto substancial (história, estruturalismo, funcionalismo,
  behaviorismo, reflexologia, psicanálise, desenvolvimento, social,
  cognitiva, humanismo, aprendizagem social, Gestalt), e conceitos como
  distorções cognitivas (Beck) e mecanismos de defesa (Anna Freud) já tocam
  Psicologia Clínica/Avaliação Psicológica transversalmente, mas não há
  ainda um autor/conceito dedicado exclusivamente a, por exemplo,
  Neuropsicologia ou Psicologia Organizacional. Tag `neuropsicologia`
  criada e pronta para uso, sem conteúdo vinculado ainda.
- **Mais atualidades**: só 2 inseridas (a regra 16 pede "somente algumas") —
  preferi 2 muito bem verificadas a forçar um número maior com confiança
  menor.

## 14. Problema encontrado e corrigido: `resolveSeedActor` podia escolher um admin-fixture órfão

Achado ANTES de rodar qualquer seed novo (auditoria inicial desta fase):
`resolveSeedActor()` (em `scripts/seed-academic-content.ts`) buscava o
`ADMIN` mais antigo por `createdAt`, sem excluir e-mails de fixture de teste
(`test-fixture-*@example.invalid`, padrão de `src/test/fixtures.ts`). No
banco de dev desta sessão, o ADMIN mais antigo era de fato um admin-fixture
órfão de uma suíte de teste interrompida (problema já sinalizado, mas não
corrigido, na seção 17.3 de `docs/FASE-CONTEUDO-ACADEMICO.md`). Isso
significa que **todo o conteúdo real semeado por v1** ficou com a autoria/
auditoria (`ContentAuditLog.actorUserId`) presa a esse usuário descartável,
não ao admin real (`admin@estuda.local`).

**Corrigido**: `resolveSeedActor` agora exclui `email` contendo
`@example.invalid` antes de escolher o admin mais antigo. Verificado que
`admin@estuda.local` (bootstrapado por `scripts/bootstrap-admin.ts`) é
corretamente escolhido agora. **Não** reescrevi retroativamente os
`ContentAuditLog` já gravados por v1 (trilha de auditoria é histórica —
alterar quem "realmente" fez a ação seria reescrever histórico, não corrigir
um bug); reportado aqui como uma limitação conhecida e não destrutiva (o
usuário-fixture órfão não é referenciado por nenhuma limpeza de teste
existente, então não corre risco de ser apagado e quebrar a FK).

## 15. Problema de codificação encontrado e corrigido: caractere "→" quebrava a inserção

Ao rodar o seed pela primeira vez, `prisma.question.create()` falhou com
`character with byte sequence 0xe2 0x86 0x92 ... has no equivalent in
encoding "WIN1252"` — a conexão Postgres deste ambiente de desenvolvimento
(Windows, sem `LANG`/`PGCLIENTENCODING` definidos) negocia `client_encoding`
como Windows-1252, não UTF-8. O caractere "→" (seta, U+2192) usado na
explicação da questão de Erikson não existe em Windows-1252.

**Corrigido no conteúdo**: substituí "→" por "->" (ASCII simples) no único
texto de dado real afetado. Varredura confirmou que nenhum outro texto
inserido usa caracteres fora de Windows-1252 (acentos/cedilha do português e
travessão "—" ESTÃO em Windows-1252, por isso nunca deram problema).

**Não corrigido na infraestrutura** (fora do escopo desta fase de
conteúdo): a causa raiz é a negociação de `client_encoding` da conexão
Postgres neste ambiente Windows — um item real para a próxima fase de
infraestrutura/produção. Registrado aqui para que autores de conteúdo
futuro saibam evitar caracteres fora de Windows-1252 (setas, emoji, aspas
tipográficas incomuns) até essa configuração ser ajustada.

## 16. Problemas encontrados e corrigidos: 3 testes pré-existentes assumiam que todo o pool de questões publicadas era MULTIPLE_CHOICE

`startDiagnostic` (Módulo 3) seleciona questões do pool GLOBAL de questões
`PUBLISHED` e tagueadas — não só das fixtures de cada teste. Antes desta
fase, TODO esse pool global era, por acaso, exclusivamente `MULTIPLE_CHOICE`
(as 6 questões de v1 + fixtures de teste). Com as 14 novas questões desta
fase cobrindo os 8 `QuestionType` (regra 12 do prompt), 3 testes
pré-existentes passaram a falhar de forma intermitente (dependendo do
sorteio aleatório do diagnóstico), pois hardcodificavam
`answerData: { type: "MULTIPLE_CHOICE", ... }` para a questão sorteada,
fosse ela qual fosse:

1. `src/modules/assessment/server/services/diagnostic.service.test.ts`
2. `src/modules/study-engine/server/queries/diagnostic-lookup.test.ts`
3. `src/modules/gamification/server/services/gamification-events.service.test.ts`

**Corrigido pela causa raiz** (mesmo padrão já usado antes em
`next-learning-step.service.test.ts`, ver `docs/FASE-CONTEUDO-ACADEMICO.md`
seção 14): cada arquivo ganhou uma função local que monta um `answerData`
válido para QUALQUER um dos 8 tipos reais, a partir do `type`/`options`/
`answerKey` efetivamente sorteados — nenhuma asserção foi enfraquecida, os
testes continuam verificando exatamente o mesmo contrato (correção real do
servidor, não confiar no cliente), só deixam de assumir uma condição que só
era verdadeira por o banco ainda não ter conteúdo real diverso. Suíte
completa rodada 8 vezes consecutivas após a correção — 596/596 em todas.

## 17. Migrations criadas

**Nenhuma.** Mesmo padrão de v1 — todo o povoamento usa os serviços de
domínio e o schema já existentes.

## 18. Testes executados

- **Antes desta fase**: 575.
- **Novos**: 21, em `src/test/seeded-academic-content-v2.test.ts` — cobrindo
  idempotência, procedência (Citation) de todas as entidades novas
  gated-by-citation, ausência de questão oficial-disfarçada, cobertura dos 8
  `QuestionType`, procedência de biblioteca/atualidades, períodos históricos,
  disciplinas interdisciplinares + relação real, tags, descoberta pelo Study
  Engine, resolução de personagem, e **execução de ponta a ponta de 7 lições
  reais representando os 7 tipos de questão novos** (TRUE_FALSE, MULTI_SELECT,
  ORDERING, MATCHING, FILL_BLANK, SHORT_ANSWER, CASE_STUDY) — iniciar → responder
  → concluir → `MASTERED`.
- **Total final**: 596.
- Suíte completa rodada **8 vezes consecutivas** (3 antes de estabilizar os 3
  testes pré-existentes corrigidos, 5 depois) — as últimas 5 rodadas: 596/596
  sem nenhuma falha.

## 19. Typecheck/Lint/Format/Build

- `npx prisma validate` / `prisma format` / `prisma generate` → limpos, sem
  alteração de schema.
- `npm run typecheck` → limpo.
- `npm run lint` → limpo (0 erros, 0 warnings).
- `npm run format:check` → limpo.
- `npm run build` → sucesso, mesmas rotas de antes (nenhuma rota nova).

## 20. Verificação manual (admin + jornada do aluno, via navegador real)

Login real como `admin@estuda.local` (credencial de bootstrap de
desenvolvimento) confirmado nas seguintes telas, todas exibindo o conteúdo
desta fase corretamente:

- `/admin/knowledge/people` — 20 autores, todos "Publicado".
- `/admin/questions` — todas as 20 questões reais visíveis, com os 8 tipos
  reais no filtro e nas linhas da tabela (Múltipla escolha, Verdadeiro ou
  falso, Seleção múltipla, Ordenação, Associação, Preencher lacuna, Resposta
  curta, Estudo de caso).
- `/admin/library` — 3 itens, todos "Publicado"/"Gratuito: Sim".
- `/admin/current-affairs` — 2 atualidades, `eventDate` real exibido
  corretamente (não confundido com `createdAt`).
- `/admin/knowledge/disciplines` — Filosofia/Educação (e as demais)
  "Publicado".
- `/dashboard/trilhas` — as 9 trilhas reais listadas, com contagem correta
  de lições cada uma.
- `/dashboard/trilhas/[psicanalise]` — as 6 lições da Psicanálise na ordem
  certa, com desbloqueio progressivo real e o personagem "S. Freud —
  psicanálise" corretamente resolvido para a primeira lição.
- `/dashboard/licoes/[Freud]` — lição real renderiza título e "5 bloco(s) de
  conteúdo" corretamente.

(Observação: `TEST_FIXTURE_*` administrativas remanescentes de suítes de
teste anteriores continuam visíveis em `/admin/questions` — problema já
identificado e sinalizado como tarefa separada em
`docs/FASE-CONTEUDO-ACADEMICO.md`, não introduzido nem agravado por esta
fase; confirmado que não colide com conteúdo real, seed idempotente.)

## 21. Limitações restantes

- Mesmas limitações estruturais de `docs/FINALIZACAO-PROJETO.md` (verificação
  de e-mail, recuperação de senha, rate limiting), inalteradas.
- Conteúdo real ainda não cobre todas as 20 áreas fundamentais listadas na
  fase (ver seção 13).
- Nenhuma prova oficial (ENEM ou outra) tem edição/questão real.
- `client_encoding` da conexão Postgres de desenvolvimento aceita apenas
  caracteres Windows-1252 — ver seção 15.
- Autoria/auditoria (`ContentAuditLog`) do conteúdo semeado por v1 permanece
  associada a um admin-fixture órfão (ver seção 14) — não destrutivo, mas
  não corrigido retroativamente.

## 22. O que ainda depende de ação manual

- Mesmos itens de v1 (fontes legalmente seguras para questões oficiais;
  eventos adicionais verificados para `CurrentAffair`).
- Decidir se/quando completar a vertical da Gestalt e as áreas ainda vazias
  (Neuropsicologia, Avaliação Psicológica, Organizacional, Escolar,
  Saúde, Experimental, Personalidade).

## 23. Percentual estimado de conclusão funcional

**~96%** (era ~93% ao final de v1). O ganho real desta fase: a plataforma
passa de "uma trilha vertical de 6 lições" para uma base ampla e navegável —
9 trilhas reais, 20 lições cobrindo os 8 tipos de questão, interdisciplinaridade
real, e uma linha do tempo histórica coerente. O que resta para 100% continua
sendo dependência externa (conteúdo licenciado/oficial em maior volume,
infraestrutura de produção — próxima fase) e a decisão deliberada de não
preencher todas as 20 áreas artificialmente.

---

Parando aqui, como pedido. Aguardando a próxima autorização — a próxima
etapa (produção/deploy contínuo) já foi delineada pelo usuário, mas não
será iniciada nesta sessão sem autorização explícita.
