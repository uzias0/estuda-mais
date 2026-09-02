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
- **Retratos**: 12 das 20 pessoas da Base de Conhecimento já têm
  ilustração real (mandada pelo usuário, mesmo processo de extração do
  transcript + recorte + remoção de fundo da fase "Arte Própria dos
  Personagens") — `public/people/{slug}.png`. As 8 restantes (Karen
  Horney, Kurt Lewin, Lev Vygotsky, Mary Ainsworth, Melanie Klein,
  Sigmund Freud, Wilhelm Wundt, William James) continuam mostrando só
  as iniciais até a arte chegar.
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

## Retratos ainda pendentes

Karen Horney, Kurt Lewin, Lev Vygotsky (a arte dele já chegou, mas é a
versão "mascote" de `public/characters/`, distinta do estilo de
`public/people/` — não reaproveitada aqui de propósito, contextos
diferentes), Mary Ainsworth, Melanie Klein, Sigmund Freud, Wilhelm
Wundt, William James. Quando a arte de cada um chegar: recortar (mesmo
processo), salvar em `public/people/{slug}.png`, adicionar ao
`PERSON_PORTRAITS` em `academic-person-portraits-fix.service.ts`, rodar
a correção (CLI ou botão do admin).

## Verificação

- 116 arquivos / 714 testes passando, typecheck e lint limpos.
- `npm run db:fix-person-portraits` rodado duas vezes contra o banco de
  desenvolvimento: primeira vez grava as 12, segunda vez confirma
  idempotência (0 atualizadas, todas "já está atualizada").
- Verificado ao vivo: `/dashboard/biblioteca/pessoas` mostra as 12
  fotos reais + 8 com iniciais (nunca uma imagem inventada); detalhe de
  Aaron Beck mostra foto, nome completo, anos, país, biografia real e a
  obra citada (`Terapia Cognitiva dos Transtornos Emocionais`, 1976).
