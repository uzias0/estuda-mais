# Fase "Arte Própria dos Personagens"

> Pedido do usuário, ao ver os personagens: "ficou muito ruim, você só
> colocou um círculo com uma barba literalmente, péssimo, eu vou criar
> um e aí eu te mando." O usuário desenhou (gerou) uma folha de figurinhas
> por personagem e mandou os arquivos pelo chat.

## O que mudou

`CharacterDef` (`config/characters.ts`) ganhou um campo opcional
`portrait` — quando presente, `CharacterAvatar` mostra essa ilustração
(`<img>`, `public/characters/`) em vez do rosto geométrico SVG. Os 7
personagens-mascote da aplicação (Freud, Jung, Skinner, Piaget, Rogers,
Bandura, mais o "Mente" neutro que continua sem retrato) agora têm 6
com arte real — só o "Mente" (não é uma figura histórica, não recebeu
arte) continua com o SVG.

## De onde vieram os arquivos

O usuário mandou 7 folhas de figurinhas (uma por personagem, 40-63 poses
cada) diretamente no chat. Como anexos de chat não chegam como arquivo
no disco (só como contexto visual), foi preciso um passo extra: as
imagens ficam embutidas em base64 no próprio transcript da sessão
(`~/.claude/projects/.../*.jsonl`) — escrevi um script Python pontual
(descartado depois de usar, não faz parte do repositório) que varre o
transcript, localiza os blocos de imagem anexados pelo usuário e
decodifica cada um de volta pra um arquivo `.png` real. A partir daí,
cada folha foi recortada (Python + Pillow) pra extrair só a primeira
pose (acenando, neutra) de cada personagem, com o fundo removido
(flood-fill a partir das bordas) e redimensionada pra 400×400 com canal
alfa — o resultado final em `public/characters/{freud,jung,skinner,
piaget,rogers,bandura}.png`.

## Decisões

- Uma pose FIXA por personagem, não uma por expressão — as folhas têm
  40-60+ poses cada, muito mais granularidade do que os 10 estados de
  `CharacterExpression` da aplicação; mapear pose-a-pose seria um
  projeto à parte. A "vida" do personagem continua vindo de fora do
  rosto (animações de entrada, `CharacterCelebration`, etc.), não de
  trocar a arte por expressão.
- `<img>` simples, não `next/image` — asset local, poucos arquivos,
  já pequeno; nenhuma otimização adicional necessária (mesma disciplina
  de "não trocar de ferramenta sem necessidade" do resto do módulo).
- Vygotsky (uma das folhas recebidas) NÃO foi adicionado como
  personagem-mascote nesta fase — sua lição está marcada com o mesmo
  `schoolSlug` ("psicologia-do-desenvolvimento") que Piaget já usa, e o
  resolvedor de personagem (`resolveCharacterForSchoolSlug`) só permite
  UM personagem por `School`. Dar a Vygotsky seu próprio mascote exigiria
  primeiro decidir uma reorganização de taxonomia de conteúdo (criar uma
  `School`/slug distinto pra ele) — decisão de conteúdo, não só de arte;
  fica pendente de uma conversa separada. O arquivo da arte dele não foi
  incluído no repositório (nada o referenciaria ainda).
- Outras 6 folhas recebidas depois (Aaron Beck, Abraham Maslow, Anna
  Freud, e novas versões de Bandura/Skinner/Jung) parecem ser para a
  base de conhecimento (`AcademicPerson`, 20 pessoas reais, campo
  `imageUrl` já existe no schema mas NENHUMA tela hoje exibe essa
  imagem) — extraídas e guardadas, mas a integração delas é um passo
  separado (precisa de uma tela que use `imageUrl`, que não existe
  ainda).

## Verificação

- Testes atualizados: `CharacterAvatar.test.ts` — o teste antigo que
  checava `aria-label` no Freud (hoje renderiza `<img>`, não `<svg>`) foi
  trocado por dois: um confirmando que personagens SEM `portrait`
  continuam com o SVG + `aria-label` de sempre, outro confirmando que
  personagens COM `portrait` renderizam a imagem real com nome+papel no
  `alt`.
- 116 arquivos / 714 testes passando, typecheck e lint limpos.
- Verificado ao vivo: lição "Freud e o Inconsciente" mostra a
  ilustração real de Freud (círculo com borda na cor da marca do
  personagem, mesmo tratamento visual de antes) em vez do SVG
  geométrico — confirmado via `naturalWidth: 400` carregando de
  `/characters/freud.png`.
