# Fase "Simulados com provas reais" (Rodada 1)

> Pedido do usuário: "faça uma curadoria completa de todas as provas
> importantes, todos simulados recentes... com as respostas de tudo",
> com links reais fornecidos:
>
> - https://www.pciconcursos.com.br/provas/fgv-psicologo
> - https://www.pciconcursos.com.br/provas/psicologo
> - https://site.cfp.org.br/servicos/titulo-de-especialista/concursos/
> - https://questoes.grancursosonline.com.br/concursos/psicologia
> - https://www.gov.br/mulheres/pt-br/acesso-a-informacao/editais
>
> Exemplo citado pelo usuário: "prova pra entrar na delegacia da mulher".

## O que já existia (Módulo 6/11)

A infraestrutura de "Prova real" já estava pronta antes desta fase:
`/dashboard/simulados` já tinha a opção "Prova real" (`kind:
EXAM_EDITION`), que monta um simulado a partir das questões de uma
`ExamEdition` específica (`buildSimulation`). O schema já tinha
`Exam → ExamEdition → Question` com `ExamBoard`/`Organization`/
`Position` como dimensões. **O que faltava era só dado real** — nenhuma
`ExamEdition` publicada existia ainda.

## Prova escolhida

Busquei pelo exemplo do usuário ("psicólogo delegacia da mulher") e
encontrei um concurso real e bem documentado: **Psicólogo Policial
Civil, Polícia Civil de Santa Catarina, Edital nº 2/2023, banca FGV**,
prova aplicada em 28/01/2024 — cargo de psicólogo em carreira policial
civil (pode incluir atuação em Delegacias Especializadas de
Atendimento à Mulher).

Fonte primária oficial (hospedada pela própria banca FGV, não um
agregador terceiro):

- [Prova (Tipo 1/Branca)](https://conhecimento.fgv.br/sites/default/files/concursos/psicologo-policial-civil-objetivacns001-tipo-1.pdf)
- [Gabarito definitivo](https://conhecimento.fgv.br/sites/default/files/concursos/pcscpsicologo2024_gabarito_definitivo_20240220.pdf) (pós-recursos, 26/02/2024)
- [Edital](https://conhecimento.fgv.br/sites/default/files/concursos/edital-de-abertura-pcsc_psicologo_doe-retificado_28.10.2024.pdf)

## O que foi importado

`scripts/seed-exam-pcsc-psicologo-2024.ts` (`npx tsx -r dotenv/config
scripts/seed-exam-pcsc-psicologo-2024.ts`) cria:

- `Source` (tipo `OFICIAL`) citando os 3 PDFs oficiais acima em
  `url`/`rightsNote`.
- `ExamBoard` "FGV", `Organization` "Polícia Civil do Estado de Santa
  Catarina", `Position` "Psicólogo Policial Civil".
- `Exam` + `ExamEdition` ("Edital nº 2/2023 — Prova aplicada em
  28/01/2024").
- **39 `Question`** — só o bloco "Psicologia" da prova (questões 61 a
  100; a prova completa tem 100, cobrindo também Português, Raciocínio
  Lógico, Direito Penal/Processual/Constitucional/Administrativo,
  Criminologia e Direitos Humanos — fora do escopo de uma plataforma de
  Psicologia). A questão 95 foi **excluída**: o gabarito oficial a
  marca como "Questão Anulada" (sem resposta correta oficial), então
  não faz sentido importá-la como questão pontuável.

Enunciados e alternativas são reproduzidos **literalmente** do caderno
oficial — a mesma prática que pciconcursos.com.br, QConcursos e Gran
Cursos (os próprios links que o usuário indicou) já fazem com provas de
concurso público: são atos administrativos oficiais, não obras
autorais no sentido de direitos de reprodução restritos.
`reproductionAllowed: true`, com toda a procedência documentada em
`Source.rightsNote` para auditoria futura.

Todas as 39 respostas corretas vêm do **gabarito definitivo pós-
recursos** (não o preliminar) — a versão final da própria banca. O
gabarito, uma tabela de 100 posições × 4 versões de caderno (Tipo
1-4), foi parseado por script (não à mão) para eliminar risco de erro
de transcrição num dado sensível como respostas de prova.

Idempotente: verifica `ExamEdition`/`Question` existentes por
nome/prompt antes de criar.

## Verificação

- 118 arquivos / 726 testes passando. Typecheck e lint limpos.
- Seed reexecutado até ficar idempotente (0 criadas, 39 já existentes).
- Testado ao vivo no navegador: login → `/dashboard/simulados` → "Prova
  real" → prova aparece no dropdown → monta simulado de 39 questões →
  responde a primeira questão → avança corretamente para a próxima.

## Próximos passos

Esta é a PRIMEIRA prova real de possivelmente muitas. Os outros 4 links
que o usuário forneceu (pciconcursos.com.br listagens gerais de FGV/
Psicólogo, CFP título de especialista, Gran Cursos, editais do
Ministério das Mulheres) contêm dezenas de outras provas candidatas —
cada uma precisa do mesmo tratamento cuidadoso (baixar PDF oficial,
achar o gabarito definitivo, filtrar só o bloco de Psicologia quando a
prova mistura disciplinas, parsear gabarito por código em vez de à
mão, excluir questões anuladas) em rodadas futuras.
