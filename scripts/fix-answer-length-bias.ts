#!/usr/bin/env node
/**
 * Correção de conteúdo: 12 questões autorais (fases de povoamento
 * acadêmico) tinham a alternativa CORRETA sistematicamente mais longa que
 * as erradas — um estudante conseguia acertar sem saber o conteúdo, só
 * escolhendo a alternativa mais longa (achado real, reportado pelo
 * usuário testando o app instalado, confirmado por análise: 13/16
 * questões de múltipla escolha/verdadeiro-falso tinham esse padrão).
 *
 * Correção: reescreve só as alternativas ERRADAS de cada questão, para
 * ficarem com nível de detalhe/tamanho comparável à correta — nenhuma
 * alternativa muda de correta para errada ou vice-versa, nenhum fato novo
 * é inventado (as reformulações só adicionam qualificadores plausíveis
 * dentro do mesmo domínio conceitual já usado pela questão original).
 * A 13ª questão sinalizada (Anna Freud, MULTI_SELECT) é falso positivo —
 * duas alternativas empatam no tamanho máximo, uma certa e uma errada,
 * então o padrão "escolha a mais longa" não é explorável ali; não foi
 * alterada.
 *
 * Usa `updateQuestion` (Módulo 3) — nenhuma escrita direta no Prisma,
 * mesma autoridade de sempre. Idempotente: rodar de novo só reaplica o
 * mesmo texto (sem duplicar nada).
 *
 * Uso: npm run db:fix-answer-length-bias
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import { updateQuestion } from "@/modules/assessment/server/services/question.service";
import { resolveSeedActor } from "./seed-academic-content";

interface Fix {
  questionId: string;
  // Mapeia o texto ORIGINAL da alternativa errada -> novo texto reescrito.
  // Chave pelo texto original (não pela posição) para nunca arriscar
  // reescrever a alternativa certa por engano.
  rewrites: Record<string, string>;
}

const FIXES: Fix[] = [
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

async function main() {
  const actor = await resolveSeedActor();
  let fixed = 0;

  for (const fix of FIXES) {
    const question = await prisma.question.findUnique({
      where: { id: fix.questionId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!question) {
      console.warn(`[fix-answer-length-bias] questão ${fix.questionId} não encontrada — pulando`);
      continue;
    }

    const newOptions = question.options.map((o) => ({
      text: fix.rewrites[o.text] ?? o.text,
      isCorrect: o.isCorrect,
      order: o.order,
    }));

    const changed = newOptions.some((o, i) => o.text !== question.options[i].text);
    if (!changed) {
      console.log(`[fix-answer-length-bias] ${fix.questionId} já está atualizada — pulando`);
      continue;
    }

    await updateQuestion(actor, question.id, { options: newOptions });
    console.log(`[fix-answer-length-bias] corrigida: ${question.prompt.slice(0, 60)}...`);
    fixed++;
  }

  console.log(`\n[fix-answer-length-bias] concluído: ${fixed} questão(ões) corrigida(s).`);
}

main()
  .catch((e) => {
    console.error("[fix-answer-length-bias] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
