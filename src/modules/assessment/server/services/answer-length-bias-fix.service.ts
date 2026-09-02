/**
 * Correção de conteúdo: questões autorais (fases de povoamento acadêmico)
 * tinham a alternativa CORRETA sistematicamente mais longa que as
 * erradas — um estudante conseguia acertar sem saber o conteúdo, só
 * escolhendo a alternativa mais longa (achado real, reportado pelo
 * usuário testando o app instalado, confirmado por análise: 13/16
 * questões de múltipla escolha/verdadeiro-falso tinham esse padrão).
 *
 * Correção: reescreve só as alternativas ERRADAS de cada questão, para
 * ficarem com nível de detalhe/tamanho comparável (ou maior) que a
 * correta — nenhuma alternativa muda de correta para errada ou
 * vice-versa, nenhum fato novo é inventado (as reformulações só
 * adicionam qualificadores plausíveis dentro do mesmo domínio conceitual
 * já usado pela questão original). A 13ª questão sinalizada originalmente
 * (Anna Freud, MULTI_SELECT) é falso positivo — duas alternativas
 * empatam no tamanho máximo, uma certa e uma errada, então o padrão
 * "escolha a mais longa" não é explorável ali; não foi alterada.
 *
 * RODADA 2 (usuário reportou de novo: "as questões que têm a resposta
 * maior sempre são acertas, em todas as vezes") — a rodada 1 reduziu o
 * viés de 81,3% para 43,8% (`FIXES_ROUND_1` abaixo), mas isso ainda
 * deixava 7 de 16 questões exploráveis; com um banco de questões pequeno
 * (ainda em expansão), o estudante encontra essas mesmas poucas questões
 * repetidamente e percebe o padrão. `FIXES_ROUND_2` reescreve as 6
 * questões genuinamente exploráveis restantes (a 7ª, Anna Freud, continua
 * sendo o mesmo falso positivo de sempre — não mexida). As mesmas
 * reescritas também foram aplicadas nos scripts de seed
 * (`seed-academic-content.ts`/`seed-academic-content-v2.ts`), para um
 * reseed futuro não reintroduzir o viés original.
 *
 * Módulo compartilhado (não um script) — usado tanto pelo CLI
 * (`scripts/fix-answer-length-bias.ts`, `npm run db:fix-answer-length-bias`,
 * para quem tem acesso a um terminal contra o banco) quanto pela Server
 * Action administrativa (`admin-maintenance-actions.ts` →
 * `/admin/manutencao`, para rodar a mesma correção contra produção sem
 * precisar de Shell/terminal — pedido do usuário: "não tenho/não sei usar
 * o Shell do Render"). Nenhuma lógica duplicada entre os dois caminhos.
 *
 * Usa `updateQuestion` (Módulo 3) — nenhuma escrita direta no Prisma,
 * mesma autoridade de sempre. Idempotente: rodar de novo só reaplica o
 * mesmo texto (sem duplicar nada) — seguro pra clicar mais de uma vez.
 */
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/authorize";
import { updateQuestion } from "@/modules/assessment/server/services/question.service";

interface AnswerLengthBiasFix {
  questionId: string;
  // Mapeia o texto ORIGINAL da alternativa errada -> novo texto reescrito.
  // Chave pelo texto original (não pela posição) para nunca arriscar
  // reescrever a alternativa certa por engano.
  rewrites: Record<string, string>;
}

const FIXES_ROUND_1: AnswerLengthBiasFix[] = [
  {
    questionId: "cmt7qcy5d005xususpk3tefa1", // Pavlov
    rewrites: {
      "Um comportamento é seguido por um reforço que aumenta sua frequência":
        "Um comportamento operante é seguido por uma consequência que aumenta a probabilidade de repetição",
      "Uma pessoa observa o comportamento de um modelo e o imita":
        "Uma pessoa observa o comportamento de um modelo e passa a imitá-lo, sem reforço direto",
      "Uma criança reorganiza qualitativamente seu pensamento em um novo estágio":
        "Uma criança reorganiza qualitativamente sua forma de pensar ao entrar em um novo estágio cognitivo",
    },
  },
  {
    questionId: "cmt7hbnj0008z5kus51xu8l1o", // Bandura
    rewrites: {
      "Um estágio do desenvolvimento cognitivo infantil":
        "Um estágio fixo do desenvolvimento cognitivo pelo qual toda criança obrigatoriamente passa",
      "Um padrão simbólico do inconsciente coletivo":
        "Um padrão simbólico universal herdado, presente no inconsciente coletivo de todas as culturas",
      "A consequência que aumenta a frequência de um comportamento":
        "A consequência ambiental que, isoladamente, aumenta a frequência futura de um comportamento",
    },
  },
  {
    questionId: "cmt7hbng4007e5kuso6pnonxg", // Rogers
    rewrites: {
      "Um estágio do desenvolvimento cognitivo infantil":
        "Um estágio fixo e universal do desenvolvimento cognitivo, presente em toda infância",
      "Um mecanismo de reforço comportamental":
        "Um mecanismo de reforço comportamental aprendido por condicionamento operante",
      "Um arquétipo do inconsciente coletivo":
        "Um arquétipo universal do inconsciente coletivo, comum a todas as culturas",
    },
  },
  {
    questionId: "cmt7qcxr4001busus6a8bnuvc", // Wundt
    rewrites: {
      "Análise de sonhos relatados livremente pelo paciente":
        "Análise de sonhos e lapsos de linguagem relatados livremente pelo paciente em associação livre",
      "Registro do comportamento observável sem referência à consciência":
        "Registro exclusivo do comportamento observável, sem qualquer referência a estados de consciência",
      "Entrevista clínica não estruturada sobre a infância":
        "Entrevista clínica não estruturada sobre lembranças e conflitos da infância do paciente",
    },
  },
  {
    questionId: "cmt7qeicj006z2gusibmug18s", // Winnicott
    rewrites: {
      "Substituir permanentemente a necessidade de vínculo com o cuidador":
        "Substituir de forma permanente e definitiva a necessidade de vínculo afetivo com o cuidador",
      "Provocar o condicionamento clássico de uma resposta de medo":
        "Provocar, por condicionamento clássico, uma resposta emocional de medo diante de um estímulo",
      "Representar um arquétipo do inconsciente coletivo":
        "Representar um arquétipo universal compartilhado no inconsciente coletivo da humanidade",
    },
  },
  {
    questionId: "cmt7qcy8s007iususmgqt0y0z", // Lewin
    rewrites: {
      "Determinado unicamente por reforços e punições passadas":
        "Determinado unicamente pelo histórico de reforços e punições recebidos no passado",
      "Resultado exclusivo de conteúdos inconscientes reprimidos":
        "Resultado exclusivo de conteúdos inconscientes reprimidos ainda na infância",
      "Uma fase fixa e universal do desenvolvimento cognitivo":
        "Uma fase fixa e universal do desenvolvimento cognitivo, igual para todas as pessoas",
    },
  },
  {
    questionId: "cmt7qcyc30090usus7xaq5uhb", // Vygotsky
    rewrites: {
      "O conjunto de reflexos inatos presentes desde o nascimento":
        "O conjunto de reflexos inatos e automáticos já presentes no bebê desde o nascimento",
      "A capacidade da criança de reprimir impulsos inconscientes":
        "A capacidade da criança de reprimir impulsos inconscientes considerados socialmente inaceitáveis",
    },
  },
  {
    questionId: "cmt7hbna100485kusz6hucikp", // Skinner
    rewrites: {
      "Eliminar completamente um comportamento":
        "Eliminar de forma completa e definitiva um comportamento indesejado",
      "Ativar um arquétipo do inconsciente coletivo":
        "Ativar um arquétipo universal armazenado no inconsciente coletivo",
      "Organizar estágios do desenvolvimento cognitivo":
        "Organizar a sequência fixa de estágios do desenvolvimento cognitivo",
    },
  },
  {
    questionId: "cmt7hbn2h00125kuse378ye1y", // Freud
    rewrites: {
      "A parte da mente responsável apenas pelo raciocínio lógico":
        "A parte consciente da mente responsável apenas pelo raciocínio lógico e pela razão",
      "Um estado de sono profundo sem nenhuma atividade mental":
        "Um estado de sono profundo em que nenhuma atividade mental ocorre",
      "A memória de curto prazo usada em tarefas do dia a dia":
        "A memória de curto prazo usada apenas em tarefas simples do dia a dia",
    },
  },
  {
    questionId: "cmt7qcy1q004eususzvvkmf1w", // Watson
    rewrites: {
      "Exclusivamente os conteúdos inconscientes relatados pelo paciente em associação livre":
        "Exclusivamente os conteúdos inconscientes reprimidos, relatados pelo paciente em associação livre",
    },
  },
  {
    questionId: "cmt7hbn6p002n5kussd7tfm3t", // Jung
    rewrites: {
      "Uma técnica de associação livre criada por Freud":
        "Uma técnica clínica de associação livre desenvolvida originalmente por Freud",
      "Um tipo de reforço usado no condicionamento operante":
        "Um tipo específico de reforço utilizado no condicionamento operante de Skinner",
      "Uma fase do desenvolvimento cognitivo infantil":
        "Uma fase específica do desenvolvimento cognitivo na primeira infância",
    },
  },
  {
    questionId: "cmt7hbncu005t5kusl7f5q2eg", // Piaget
    rewrites: {
      "Etapas de reforço e punição no condicionamento operante":
        "Etapas sucessivas de reforço e punição descritas no condicionamento operante",
      "Camadas do inconsciente coletivo":
        "Camadas sobrepostas do inconsciente coletivo compartilhadas entre culturas",
      "Níveis de autoeficácia percebida":
        "Níveis crescentes de autoeficácia percebida ao longo da vida adulta",
    },
  },
];

/**
 * RODADA 2 — ver comentário do topo do arquivo. Chaves são o texto
 * ATUAL (já reescrito pela rodada 1), não o texto original do seed.
 */
const FIXES_ROUND_2: AnswerLengthBiasFix[] = [
  {
    questionId: "cmt7hbnj0008z5kus51xu8l1o", // Bandura
    rewrites: {
      "Um estágio fixo do desenvolvimento cognitivo pelo qual toda criança obrigatoriamente passa":
        "Um estágio fixo e universal do desenvolvimento cognitivo pelo qual toda criança obrigatoriamente passa, segundo Piaget",
      "Um padrão simbólico universal herdado, presente no inconsciente coletivo de todas as culturas":
        "Um padrão simbólico universal herdado, presente desde o nascimento no inconsciente coletivo de todas as culturas humanas",
      "A consequência ambiental que, isoladamente, aumenta a frequência futura de um comportamento":
        "A consequência ambiental que, isoladamente e sem nenhuma influência cognitiva, aumenta a frequência futura de um comportamento",
    },
  },
  {
    questionId: "cmt7qeicj006z2gusibmug18s", // Winnicott
    rewrites: {
      "Substituir de forma permanente e definitiva a necessidade de vínculo afetivo com o cuidador":
        "Substituir de forma permanente e definitiva e sem exceções a necessidade de vínculo afetivo com o cuidador principal",
      "Provocar, por condicionamento clássico, uma resposta emocional de medo diante de um estímulo":
        "Provocar, por condicionamento clássico repetido, uma resposta emocional de medo diante de um estímulo neutro associado",
      "Representar um arquétipo universal compartilhado no inconsciente coletivo da humanidade":
        "Representar um arquétipo universal compartilhado no inconsciente coletivo de toda a espécie humana, segundo Jung",
    },
  },
  {
    questionId: "cmt7qcxr4001busus6a8bnuvc", // Wundt
    rewrites: {
      "Análise de sonhos e lapsos de linguagem relatados livremente pelo paciente em associação livre":
        "Análise de sonhos e lapsos de linguagem relatados livremente pelo paciente durante a associação livre, segundo Freud",
      "Registro exclusivo do comportamento observável, sem qualquer referência a estados de consciência":
        "Registro exclusivo do comportamento observável, sem qualquer referência a estados internos de consciência, segundo Watson",
      "Entrevista clínica não estruturada sobre lembranças e conflitos da infância do paciente":
        "Entrevista clínica não estruturada sobre lembranças e conflitos da infância do paciente, conduzida sem protocolo fixo",
    },
  },
  {
    questionId: "cmt7hbn2h00125kuse378ye1y", // Freud
    rewrites: {
      "A parte consciente da mente responsável apenas pelo raciocínio lógico e pela razão":
        "A parte consciente da mente responsável apenas pelo raciocínio lógico e pela razão, segundo essa mesma teoria",
      "Um estado de sono profundo em que nenhuma atividade mental ocorre":
        "Um estado de sono profundo e sem sonhos em que nenhuma atividade mental ocorre de forma alguma",
      "A memória de curto prazo usada apenas em tarefas simples do dia a dia":
        "A memória de curto prazo usada apenas em tarefas simples e repetitivas do dia a dia, sem relação com o inconsciente",
    },
  },
  {
    questionId: "cmt7qcyc30090usus7xaq5uhb", // Vygotsky
    rewrites: {
      "Um estágio fixo e universal do desenvolvimento cognitivo, igual para todas as culturas":
        "Um estágio fixo e universal do desenvolvimento cognitivo, igual para todas as culturas e faixas etárias, segundo Piaget",
      "O conjunto de reflexos inatos e automáticos já presentes no bebê desde o nascimento":
        "O conjunto de reflexos inatos e automáticos já presentes no bebê desde o nascimento, sem nenhuma influência do meio social",
      "A capacidade da criança de reprimir impulsos inconscientes considerados socialmente inaceitáveis":
        "A capacidade da criança de reprimir impulsos inconscientes considerados socialmente inaceitáveis, segundo a psicanálise",
    },
  },
  {
    questionId: "cmt7hbncu005t5kusl7f5q2eg", // Piaget
    rewrites: {
      "Etapas sucessivas de reforço e punição descritas no condicionamento operante":
        "Etapas sucessivas de reforço e punição descritas no condicionamento operante, segundo Skinner",
      "Camadas sobrepostas do inconsciente coletivo compartilhadas entre culturas":
        "Camadas sobrepostas do inconsciente coletivo compartilhadas entre culturas distintas, segundo Jung",
      "Níveis crescentes de autoeficácia percebida ao longo da vida adulta":
        "Níveis crescentes de autoeficácia percebida ao longo da vida adulta, segundo a teoria social cognitiva",
    },
  },
];

export const ANSWER_LENGTH_BIAS_FIXES: AnswerLengthBiasFix[] = [...FIXES_ROUND_1, ...FIXES_ROUND_2];

export interface AnswerLengthBiasFixResult {
  questionId: string;
  promptPreview: string;
  status: "fixed" | "already-up-to-date" | "not-found";
}

/**
 * Aplica todas as reescritas (rodada 1 + rodada 2) contra o banco que o
 * `actor` estiver acessando — mesma função, chamada tanto do CLI quanto
 * da Server Action administrativa (ver comentário do topo do arquivo).
 */
export async function applyAnswerLengthBiasFixes(
  actor: Actor,
): Promise<{ fixed: number; results: AnswerLengthBiasFixResult[] }> {
  const results: AnswerLengthBiasFixResult[] = [];
  let fixed = 0;

  for (const fix of ANSWER_LENGTH_BIAS_FIXES) {
    const question = await prisma.question.findUnique({
      where: { id: fix.questionId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!question) {
      results.push({
        questionId: fix.questionId,
        promptPreview: "(questão não encontrada)",
        status: "not-found",
      });
      continue;
    }

    const newOptions = question.options.map((o) => ({
      text: fix.rewrites[o.text] ?? o.text,
      isCorrect: o.isCorrect,
      order: o.order,
    }));

    const changed = newOptions.some((o, i) => o.text !== question.options[i].text);
    if (!changed) {
      results.push({
        questionId: fix.questionId,
        promptPreview: question.prompt.slice(0, 60),
        status: "already-up-to-date",
      });
      continue;
    }

    await updateQuestion(actor, question.id, { options: newOptions });
    results.push({
      questionId: fix.questionId,
      promptPreview: question.prompt.slice(0, 60),
      status: "fixed",
    });
    fixed++;
  }

  return { fixed, results };
}
