# Fase de Povoamento Acadêmico Real

> Executada por uma única linha de execução, sem agentes paralelos (regra 21
> do prompt desta fase). Complementa `docs/ARQUITETURA.md` e
> `docs/FINALIZACAO-PROJETO.md`; não reabre nem contradiz nenhum módulo
> anterior — só popula conteúdo real sobre a estrutura já existente.

## 1. Status

Concluída dentro do escopo deliberadamente reduzido descrito na seção 18 do
prompt ("não quero quantidade artificial enorme... base inicial
significativa"). Uma base vertical completa e real foi criada e testada de
ponta a ponta: 6 psicólogos historicamente reais, cada um com Escola →
Teoria → Conceito → Obra → Questão autoral → Lição publicada, mais 1 item de
biblioteca real de domínio público e a estrutura (sem edições/questões) do
ENEM. Todos os testes, `typecheck`, `lint` e `build` passam.

## 2. Quantidade de disciplinas

**1** — `Psicologia` (publicada, citando o verbete correspondente da
Wikipédia em português).

## 3. Quantidade de conceitos

**6**: Inconsciente (Freud), Arquétipo (Jung), Condicionamento Operante
(Skinner), Estágios do Desenvolvimento Cognitivo (Piaget), Tendência à
Autorrealização (Rogers), Autoeficácia (Bandura). Todos publicados, todos
com `Citation` real.

## 4. Quantidade de autores

**6** `AcademicPerson`: Sigmund Freud, Carl Gustav Jung, B. F. Skinner, Jean
Piaget, Carl Rogers, Albert Bandura — os mesmos 6 já usados pelo sistema de
personagens (`src/config/characters.ts`). Datas de nascimento/morte,
nacionalidade e papel histórico verificados por busca antes de escrever o
script (ver seção 12).

## 5. Quantidade de obras

**6** `AcademicWork` (uma por autor): _A Interpretação dos Sonhos_ (Freud,
1900), _Tipos Psicológicos_ (Jung, 1921), _The Behavior of Organisms_
(Skinner, 1938), _A Psicologia da Inteligência_ (Piaget, 1947), _Terapia
Centrada no Cliente_ (Rogers, 1951), _Self-Efficacy: The Exercise of
Control_ (Bandura, 1997).

## 6. Quantidade de períodos

**0** — nenhum `HistoricalPeriod` foi criado nesta fase. Datas de nascimento/
morte já situam cada autor no tempo; não inventei limites de período
histórico sem uma fonte específica para essa delimitação (campo opcional,
sem prejuízo ao restante do grafo).

## 7. Quantidade de lições

**6**, uma por conceito, cada uma com 5 blocos (`INTRO`/`CONCEPT`/`EXAMPLE`/
`QUESTION`/`CONCLUSION`) e publicada de ponta a ponta (citação + blocos).
Conectadas à árvore pedagógica real: 1 `Track` ("Fundamentos da Psicologia:
Escolas e Teorias") → 1 `LearningArea` ("Escolas e Teorias Psicológicas") →
1 `Unit` ("Grandes Escolas do Pensamento Psicológico", ancorada na
Disciplina Psicologia) → 6 `Stage`s → as 6 `Lesson`s. Toda a cadeia está
`PUBLISHED` e confirmada descobrível pelo Study Engine (teste de integração,
seção 14).

## 8. Quantidade de questões

**6**, uma por conceito, `MULTIPLE_CHOICE`, todas **autorais** (`Source`
`sourceType=AUTORAL`, `examEditionId=null` — nunca atribuídas a nenhuma
banca/prova real, conforme regra 8 do prompt). Publicadas, vinculadas ao
conceito correspondente via `QuestionKnowledgeTag`.

## 9. Quantidade de provas

**1** `Exam` (`ENEM`), **0** edições. Deliberado — ver seção 13
(limitações).

## 10. Quantidade de itens de biblioteca

**1** `LibraryItem`: _The Interpretation of Dreams_ (tradução inglesa de A.
A. Brill, 1913), gratuito e de domínio público real, hospedado no Project
Gutenberg (eBook #66048) — `isFree=true`, `freeAccessReason=PUBLIC_DOMAIN`.

## 11. Quantidade de atualidades

**0** — ver seção 13 (limitações). Nenhum acontecimento específico foi
verificado com confiança suficiente para popular `CurrentAffair` nesta
sessão.

## 12. Fontes utilizadas

- **Wikipédia em português** (6 artigos, um por autor) — fatos biográficos
  (datas de nascimento/morte, nacionalidade) e conceituais, todos
  conferidos por busca web antes de escrever o script de seed. Nenhum dado
  foi inventado; datas cruzadas em múltiplas fontes independentes durante a
  pesquisa (ex.: Skinner 20/03/1904–18/08/1990, Bandura 04/12/1925–
  26/07/2021).
- **Project Gutenberg** — eBook #66048 (_The Interpretation of Dreams_,
  trad. A. A. Brill), fonte real do item de biblioteca gratuito.
- **INEP — Matriz de Referência do ENEM**
  (`https://download.inep.gov.br/download/enem/matriz_referencia.pdf`) —
  registrada como `Source` oficial, associada à estrutura `Exam` (sem
  edição/questão).
- **Autoral** — 1 `Source` própria (`sourceType=AUTORAL`) para as 6
  questões redigidas originalmente para esta fase.

## 13. Conteúdo que não pôde ser incluído por restrição de direitos/fonte

- **ENEM/ENCCEJA/ENADE/vestibulares — edições e questões oficiais**: nenhuma
  fonte legalmente segura E verificada para reprodução de questões/gabaritos
  reais foi confirmada nesta sessão. Criar uma `ExamEdition`/`Question`
  atribuída a uma prova real sem essa verificação violaria a regra 6-8 do
  prompt ("nunca atribuir uma questão a uma banca/universidade sem
  comprovação"). Só a estrutura `Exam` "ENEM" existe, citando a matriz
  oficial — pronta para receber edições reais quando uma fonte legal for
  fornecida.
- **`CurrentAffair`**: nenhum acontecimento específico, com data e fonte
  verificadas com confiança suficiente, foi levantado nesta sessão dentro do
  orçamento de tempo disponível. Preferi não inserir a arriscar uma data ou
  fato impreciso (regra 21: "não inventar acontecimentos").
- **Filosofia, História, Sociologia, conteúdo sobre mulheres na história**
  (seções 3/4/5/11 do prompt): não populados nesta passagem — o escopo desta
  fase foi deliberadamente contido a uma base vertical completa e bem
  verificada (Psicologia) em vez de uma base larga e rasa em 4 áreas ao
  mesmo tempo, seguindo a regra 18 ("qualidade sobre quantidade", "lotes
  pequenos e verificáveis"). A estrutura (Discipline/Concept/AcademicPerson/
  AcademicRelation/Tag) já suporta essas áreas sem nenhuma mudança de
  schema — é só questão de rodar o mesmo padrão de povoamento com fontes
  verificadas para Filosofia/História/Sociologia num próximo lote.
- **`HistoricalPeriod`**: nenhum período foi criado — decisão deliberada
  (seção 6).

## 14. Testes executados

`npm run test -- --run` → **541/541 passando** (533 anteriores + 8 novos em
`src/test/seeded-academic-content.test.ts`), suíte inteira, determinística.
Novos testes cobrem exatamente o que a seção 20 do prompt pediu que fosse
coberto e que ainda não existia:

- Idempotência real de `seedAcademicContent` (roda 2x, confirma contagem
  idêntica).
- Procedência: toda entidade `PUBLISHED` gated por Citation (School/Theory/
  Concept/Person/Discipline/Lesson) tem pelo menos uma `Citation` real.
- Nenhuma questão semeada finge ser oficial (autoral, `examEditionId=null`).
- Item de biblioteca gratuito com procedência real de domínio público.
- Ativação real da resolução de personagem por escola (`resolveCharacterForSchoolSlug`
  — antes só existia o mecanismo, sem `School` publicada para exercitá-lo).
- `resolveCharacterForLesson` (novo, ver seção 15) resolve corretamente
  Lesson → Concept → Theory → School → personagem.
- Descoberta pelo Study Engine de uma Lesson semeada para um aluno novo.
- Execução de ponta a ponta de uma lição semeada real (iniciar → responder
  questão real → concluir → XP/`MASTERED`).

Um teste PRÉ-EXISTENTE (`next-learning-step.service.test.ts`) quebrou ao
rodar a suíte inteira após o seed — não foi mascarado nem enfraquecido:
investigado, a causa raiz era a suposição (implícita, nunca antes exposta)
de que nenhuma outra `Track` publicada existiria no banco ao testar a
varredura "sem `trackId`". Como o banco de dev/CI agora tem conteúdo real
permanente coexistindo com fixtures de teste, corrigi o teste para verificar
o contrato real da função (varre trilhas publicadas em ordem crescente de
`id`, primeira com lição disponível) de forma dinâmica, em vez de assumir
banco vazio — mesmo padrão de correção de causa raiz já usado na etapa
anterior para o flake de paralelismo.

## 15. Typecheck/Lint/Build

- `npx prisma validate` / `prisma format` / `prisma generate` → limpos, sem
  alteração de schema.
- `npm run typecheck` → limpo.
- `npm run lint` → limpo (0 erros, 0 warnings).
- `npm run format:check` → limpo.
- `npm run build` → sucesso, mesmas rotas de antes (nenhuma rota nova).

Além do seed em si, esta fase corrigiu uma lacuna real encontrada durante o
trabalho (não pedida explicitamente, mas exigida pela seção 14 do prompt —
"os personagens devem aparecer organicamente... Freud associado à
Psicanálise"): `resolveCharacterForSchoolSlug` existia desde a etapa
anterior, mas **nunca era chamada em lugar nenhum** — sem `School`
publicada, era código morto. Adicionei `resolveCharacterForLesson`
(`src/lib/characters.ts`, percorre `Lesson → Concept → Theory → School`,
reaproveitando as relações N:N já existentes) e conectei a
`/dashboard/licoes/[lessonId]` — agora a lição de Freud mostra o personagem
Freud, a de Jung mostra Jung, etc., com fallback ao personagem neutro
quando não houver associação real (nenhuma lição de terceiros afetada).

## 16. Migrations criadas

**Nenhuma.** Todo o povoamento usa os serviços de domínio e o schema já
existentes; nenhuma entidade nova foi necessária.

## 17. Problemas encontrados e corrigidos

1. `resolveCharacterForSchoolSlug` nunca era chamada (código morto) — ver
   seção 15.
2. `next-learning-step.service.test.ts` assumia banco vazio — ver seção 14.
3. **Achado, não corrigido nesta fase (fora de escopo, sinalizado
   separadamente)**: linhas `TEST_FIXTURE_*` órfãs no banco de dev,
   remanescentes de uma interrupção de processo (banco de dados travado)
   ocorrida durante a etapa de fechamento anterior. Confirmado que não
   colidem com o conteúdo real desta fase (nenhuma duplicata criada — a
   idempotência do seed foi verificada rodando duas vezes e comparando
   contagens exatas). Uma tarefa separada foi sinalizada para limpar essas
   linhas.

## 18. Limitações restantes

- Conteúdo real cobre só Psicologia (6 escolas/autores) — Filosofia,
  História, Sociologia e o recorte "Mulheres, Gênero e História do
  Pensamento" continuam vazios (estrutura pronta, sem dado ainda).
- Nenhuma prova oficial (ENEM ou outra) tem edição/questão real — só a
  categoria `Exam` está registrada.
- Nenhuma atualidade (`CurrentAffair`) foi inserida.
- Nenhum `HistoricalPeriod` foi criado.
- Mesmas limitações estruturais já documentadas em `docs/FINALIZACAO-
PROJETO.md` (verificação de e-mail, recuperação de senha, rate limiting de
  borda) — inalteradas por esta fase, que foi só de conteúdo.

## 19. O que ainda depende de ação manual

- Fornecer (ou autorizar a busca de) fontes legalmente seguras e
  verificadas para questões oficiais de provas reais, antes de qualquer
  `ExamEdition`/`Question` atribuída a uma banca.
- Fornecer ou verificar acontecimentos reais e datados para popular
  `CurrentAffair`.
- Decidir se/quando expandir o mesmo padrão de povoamento (Fonte → Pessoa/
  Conceito → Teoria/Escola → Questão → Lição, sempre citado) para Filosofia,
  História e Sociologia.

## 20. Percentual estimado de conclusão funcional

**~93%** (era ~92% ao final da etapa de fechamento anterior). O ganho real
desta fase: a plataforma deixa de "parecer vazia" para um novo aluno — há
agora uma trilha real, publicada, com 6 lições genuínas, personagens
corretamente associados, e uma cadeia de procedência íntegra do início ao
fim. O que resta para 100% continua sendo o mesmo tipo de dependência
externa já documentado (conteúdo licenciado/oficial em maior volume,
verificação de e-mail, infraestrutura de produção) — não uma lacuna de
engenharia.

---

Parando aqui, como pedido. Aguardando a próxima autorização.
