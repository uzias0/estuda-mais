# Correções: logout volta pro lugar errado + fluxo "muito seco"

> Pedidos do usuário: "quando que entro na minha conta e eu saio dela, é
> pra ir de novo pra aquela primeira página que tem o quiz... quando eu
> clico pra sair, ele só volta pra tela de login, ele não volta pra tela
> lá do quiz, o inicial" — e, separadamente: "está muito seco, adicione
> transições quando você vai de uma coisa pra outra."

## Logout

`signOutAction` (`auth-actions.ts`) redirecionava pra `/login` — resquício
de antes da fase "diagnóstico antes do cadastro", quando `/login` ainda
era a porta de entrada padrão. Agora redireciona pra `/comecar` (o
mesmo fluxo boas-vindas → tutorial → diagnóstico que um visitante novo
vê), que já tem um link discreto "Já tem conta? Entrar" pra quem só quer
logar nesse mesmo instante. Teste de integração (`auth-actions.test.ts`)
atualizado para o novo destino.

## Transições

Nenhum dos três fluxos com fases via `useState<Phase>` tinha qualquer
animação de entrada — trocar de fase substituía o conteúdo instantâneo,
sem nenhuma pista visual de que algo mudou. `.fade-in-up` (já existente
em `globals.css`, respeitando `prefers-reduced-motion`) foi aplicado:

- `ComecarFlow.tsx`: fases "boas-vindas" e "tutorial" (a fase
  "diagnóstico" delega pro próprio `DiagnosticRunner`).
- `DiagnosticRunner.tsx`: fase "intro"; e um wrapper com
  `key={`${question.id}-${phase}`}` ao redor do conteúdo
  questão/feedback — sem a `key`, é o MESMO nó DOM só trocando de
  filhos entre uma questão e outra, então a animação (que só toca na
  MONTAGEM do elemento) nunca replayaria a cada questão.
- `LessonRunner.tsx`: fases "sem baterias", "não iniciada", "concluída",
  "todos os blocos feitos mas não finalizada"; e o mesmo padrão de
  `key={`${currentBlock.id}-${phase}`}` no conteúdo bloco/feedback
  principal (mesmo raciocínio do `DiagnosticRunner`).

Resultado: toda troca de fase agora tem uma entrada suave (fade + leve
deslocamento vertical), sem introduzir nenhuma biblioteca de animação
nova — reaproveita 100% a classe que já existia.

## Verificação

- 116 arquivos / 713 testes passando, typecheck e lint limpos.
- Verificado ao vivo: logout de uma conta real aterrissa em `/comecar`
  (confirmado via `window.location.href`); transição welcome→tutorial
  capturada em pleno fade (screenshot com o conteúdo ainda
  semi-transparente/deslocado), confirmando que a animação está
  realmente tocando a cada troca de fase.
