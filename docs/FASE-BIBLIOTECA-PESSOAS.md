# Fase "Biblioteca de Pessoas"

> Pedido do usuário: uma lista completa dos filósofos/pessoas do app pra
> ele desenhar (gerar) uma imagem de cada um. Depois de receber a lista,
> escolheu onde mostrar: "Biblioteca/base de conhecimento" +
> "Dentro das lições".

## O que foi feito

- `academicPerson.service.ts`: `listAcademicPersons` ganhou um filtro
  opcional `status` (mesmo padrão de `listLibraryItems({status})`);
  `getAcademicPersonBySlug(slug)` novo — leitura pública por slug, só
  PUBLISHED (checado de novo na própria página, defesa em profundidade
  igual a `biblioteca/[id]/page.tsx`).
- `academic-person.schema.ts`: `imageUrl` deixou de exigir uma URL
  completa (`z.string().url()`) — agora aceita também um caminho
  relativo iniciado por `/` (`/people/slug.png`), mesmo padrão já usado
  por `CharacterDef.portrait`. As ilustrações são asset local do
  próprio app, nunca uma URL de terceiro.
- **Páginas novas**: `/dashboard/biblioteca/pessoas` (grade com foto ou
  iniciais + nome + anos) e `/dashboard/biblioteca/pessoas/[slug]`
  (foto, nome completo, anos, país, biografia, obras). Link "Ver
  pessoas" adicionado à Biblioteca existente.
- **Retratos**: as 20 pessoas da Base de Conhecimento têm ilustração
  real (mandada pelo usuário, mesmo processo de extração do transcript
  + recorte + remoção de fundo da fase "Arte Própria dos Personagens")
  — `public/people/{slug}.png`. Duas pessoas (Sigmund Freud, Wilhelm
  Wundt) têm um leve resquício de fundo (a folha de figurinhas deles
  usa um fundo ilustrado, não branco liso — a remoção automática de
  fundo não consegue limpar completamente); pouco perceptível no
  tamanho real de exibição (72-120px), aceito como está.
- `academic-person-portraits-fix.service.ts` (+ CLI
  `scripts/fix-person-portraits.ts`, `npm run db:fix-person-portraits`,
  + botão em `/admin/manutencao`, mesmo padrão de
  `answer-length-bias-fix.service.ts`): grava `imageUrl` via
  `updateAcademicPerson` (Módulo 2), nunca escrita direta no Prisma.
  Idempotente.

## "Dentro das lições" — não incluído nesta entrega

O usuário também pediu para mostrar a foto dentro das lições. Investigado
e não incluído: hoje NÃO existe um caminho estrutural de "esta lição" até
"esta `AcademicPerson`" no schema. `Lesson` se liga a `Concept` (via
`LessonKnowledgeTag`), `Concept` se liga a `Theory`, mas `Theory` não tem
nenhuma relação com `AcademicPerson` — e o slug do `Concept` (ex.:
"inconsciente") não é o mesmo do `AcademicPerson` (ex.: "sigmund-freud"),
então não dá pra inferir por convenção de nome também. Forçar essa
conexão exigiria uma decisão de modelagem de conteúdo (adicionar uma
relação `Theory.personId` ou equivalente) — maior que só um recorte de
imagem, fica pra uma conversa/entrega separada.

## Retratos pendentes

Nenhum — as 20 pessoas têm ilustração real.

## Verificação

- 116 arquivos / 714 testes passando, typecheck e lint limpos.
- `npm run db:fix-person-portraits` rodado em duas levas conforme a
  arte chegava (12 pessoas, depois +7): idempotência confirmada em
  cada rodada (quem já tinha retrato aparece "já está atualizada").
- Verificado ao vivo: `/dashboard/biblioteca/pessoas` mostra as 20
  fotos reais (nunca uma imagem inventada); detalhe de Aaron Beck
  mostra foto, nome completo, anos, país, biografia real e a obra
  citada (`Terapia Cognitiva dos Transtornos Emocionais`, 1976);
  detalhe de Sigmund Freud confirma que o resquício de fundo é
  imperceptível no tamanho real de exibição; detalhe de Lev Vygotsky
  confirma a última pessoa (mascote vs. Biblioteca de Pessoas usando
  arquivos distintos corretamente).
