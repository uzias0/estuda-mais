#!/usr/bin/env node
/**
 * Fase "expansão de questões" (pedido do usuário: "por exemplo de Freud
 * só teve uma questão... quero que cada uma tenha no mínimo, questões
 * do básico até o mais avançado possível") — cada um dos 20 conceitos
 * autorais já seedados (`seed-academic-content.ts`/`-v2.ts`) tinha
 * exatamente 1 questão. Este script adiciona 4 questões NOVAS por
 * conceito (INICIANTE, BASICO, INTERMEDIARIO, AVANCADO — os 4
 * primeiros níveis de `Difficulty`, cobrindo "do básico ao mais
 * avançado"), usando o MESMO `Concept`/`Source` já existentes (nenhuma
 * entidade de conhecimento nova) — só mais profundidade de avaliação
 * por tópico. `createQuestion`/`linkQuestionToKnowledge`/
 * `publishQuestion` (Módulo 3) — nenhuma escrita direta no Prisma,
 * mesma autoridade de sempre.
 *
 * Conteúdo 100% autoral (mesma fonte "Conteúdo autoral — plataforma
 * Estuda+" já usada pelas 20 questões originais) — fatos de psicologia
 * amplamente estabelecidos em livros-texto, nenhuma citação de prova
 * real (isso é o próximo passo, simulados, com curadoria de provas
 * verificáveis). Alternativas erradas escritas com comprimento
 * comparável (ou maior) que a correta desde o início — lição aprendida
 * na fase "viés de tamanho de alternativa", nunca repetida aqui.
 *
 * Idempotente por natureza best-effort: usa `prompt` como chave de
 * "já existe" antes de criar — rodar de novo não duplica.
 *
 * Uso: npm run db:seed-questions-expansion-1
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import {
  createQuestion,
  linkQuestionToKnowledge,
  publishQuestion,
} from "@/modules/assessment/server/services/question.service";
import { resolveSeedActor } from "./seed-academic-content";

interface NewQuestion {
  conceptSlug: string;
  difficulty: "INICIANTE" | "BASICO" | "INTERMEDIARIO" | "AVANCADO";
  prompt: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
}

const QUESTIONS: NewQuestion[] = [
  // ---- Freud — Inconsciente -------------------------------------------
  {
    conceptSlug: "inconsciente",
    difficulty: "INICIANTE",
    prompt: "Para Freud, um sonho é melhor entendido como:",
    options: [
      {
        text: "Uma manifestação indireta de conteúdos inconscientes, disfarçados por censura psíquica",
        isCorrect: true,
      },
      {
        text: "Um evento neurológico aleatório, sem nenhuma relação com a vida mental ou emocional da pessoa",
        isCorrect: false,
      },
      {
        text: "Uma lembrança exata e literal de um acontecimento recente do dia anterior",
        isCorrect: false,
      },
      {
        text: "Um sinal físico de cansaço muscular acumulado durante o dia todo",
        isCorrect: false,
      },
    ],
    explanation:
      "Freud via o sonho como 'a via régia' para o inconsciente — o conteúdo latente (o desejo real) aparece disfarçado no conteúdo manifesto (o sonho lembrado), por causa da censura psíquica.",
  },
  {
    conceptSlug: "inconsciente",
    difficulty: "BASICO",
    prompt: "O 'ato falho' (lapso de linguagem, esquecimento) é interpretado por Freud como:",
    options: [
      {
        text: "Uma pista de um conteúdo inconsciente que encontrou uma brecha para se expressar",
        isCorrect: true,
      },
      {
        text: "Um erro puramente mecânico da fala, sem nenhum significado psicológico por trás",
        isCorrect: false,
      },
      {
        text: "Um sintoma exclusivo de quadros neurológicos graves, nunca presente em pessoas saudáveis",
        isCorrect: false,
      },
      {
        text: "Uma falha de memória de curto prazo, sem relação com desejos ou conflitos internos",
        isCorrect: false,
      },
    ],
    explanation:
      "Para Freud, atos falhos não são acaso — revelam, de forma disfarçada, um desejo ou conflito recalcado que 'escapou' do controle consciente.",
  },
  {
    conceptSlug: "inconsciente",
    difficulty: "INTERMEDIARIO",
    prompt: "Na segunda tópica freudiana (id, ego, superego), o inconsciente:",
    options: [
      {
        text: "Não se limita ao id — o ego e o superego também têm partes inconscientes de si mesmos",
        isCorrect: true,
      },
      {
        text: "É exatamente o mesmo território do id, sem nenhuma outra instância psíquica envolvida",
        isCorrect: false,
      },
      {
        text: "Existe só na primeira tópica freudiana e desaparece completamente na segunda",
        isCorrect: false,
      },
      {
        text: "É controlado inteiramente pelo superego, que reprime tudo sozinho, sem qualquer ajuda do ego ou do id",
        isCorrect: false,
      },
    ],
    explanation:
      "Freud reformulou sua teoria (2ª tópica): id, ego e superego não coincidem exatamente com consciente/inconsciente — partes do ego (defesas) e do superego (culpa inconsciente) também operam fora da consciência.",
  },
  {
    conceptSlug: "inconsciente",
    difficulty: "AVANCADO",
    prompt: "Uma crítica metodológica clássica à noção freudiana de inconsciente é que:",
    options: [
      {
        text: "Suas hipóteses são difíceis de falsear empiricamente, um problema apontado por filósofos da ciência como Popper",
        isCorrect: true,
      },
      {
        text: "Freud nunca escreveu sobre o conceito, que teria sido inventado só por seus seguidores posteriores",
        isCorrect: false,
      },
      {
        text: "O conceito foi imediatamente comprovado por experimentos de laboratório logo em sua primeira formulação, sem nenhuma contestação",
        isCorrect: false,
      },
      {
        text: "Nenhum psicólogo depois de Freud discordou ou propôs qualquer alternativa a essa ideia central",
        isCorrect: false,
      },
    ],
    explanation:
      "Karl Popper argumentou que teorias psicanalíticas, incluindo o inconsciente, seriam pouco falseáveis — qualquer resultado pareceria confirmar a teoria, uma crítica influente na filosofia da ciência.",
  },

  // ---- Jung — Arquétipo ------------------------------------------------
  {
    conceptSlug: "arquetipo",
    difficulty: "INICIANTE",
    prompt: "O 'inconsciente coletivo', na teoria de Jung, é:",
    options: [
      {
        text: "Uma camada psíquica compartilhada por toda a humanidade, distinta das lembranças pessoais de cada um",
        isCorrect: true,
      },
      {
        text: "O mesmo que o inconsciente pessoal de Freud, só que com outro nome dado por Jung",
        isCorrect: false,
      },
      {
        text: "Um conjunto de memórias reais e conscientes compartilhadas por uma mesma família",
        isCorrect: false,
      },
      {
        text: "Uma técnica terapêutica usada exclusivamente para tratar fobias específicas e isoladas, sem nenhum outro uso",
        isCorrect: false,
      },
    ],
    explanation:
      "Jung propôs que, além do inconsciente pessoal (as próprias vivências recalcadas), existe uma camada coletiva, herdada, comum à espécie humana — povoada por arquétipos.",
  },
  {
    conceptSlug: "arquetipo",
    difficulty: "BASICO",
    prompt: "A 'Sombra', um arquétipo descrito por Jung, representa:",
    options: [
      {
        text: "Os aspectos da personalidade que a pessoa rejeita ou não reconhece conscientemente em si mesma",
        isCorrect: true,
      },
      {
        text: "A imagem social que a pessoa mostra deliberadamente para os outros no dia a dia",
        isCorrect: false,
      },
      {
        text: "Um espírito literalmente sobrenatural que acompanha fisicamente cada pessoa desde o nascimento até a morte",
        isCorrect: false,
      },
      {
        text: "A parte do corpo que projeta sombra real sob a luz, sem nenhum sentido psicológico",
        isCorrect: false,
      },
    ],
    explanation:
      "A Sombra reúne traços, impulsos e desejos que o ego não aceita como seus — muitas vezes projetados nos outros ('eu não sou assim, mas fulano é').",
  },
  {
    conceptSlug: "arquetipo",
    difficulty: "INTERMEDIARIO",
    prompt: "O processo de 'individuação', central na psicologia analítica de Jung, descreve:",
    options: [
      {
        text: "A integração gradual de conteúdos inconscientes (como a Sombra) à consciência, rumo a um si-mesmo mais completo",
        isCorrect: true,
      },
      {
        text: "A separação física entre uma criança e seus pais durante a primeira infância, sem nenhuma relação com o inconsciente",
        isCorrect: false,
      },
      {
        text: "Um processo puramente social de tornar-se independente financeiramente da própria família",
        isCorrect: false,
      },
      {
        text: "A escolha de uma profissão individual, distinta da carreira seguida pelos próprios pais",
        isCorrect: false,
      },
    ],
    explanation:
      "Individuação é o processo, geralmente ao longo da vida, de integrar partes inconscientes da psique (incluindo a Sombra) à consciência, buscando um 'si-mesmo' mais íntegro.",
  },
  {
    conceptSlug: "arquetipo",
    difficulty: "AVANCADO",
    prompt:
      "Uma diferença central entre a ruptura teórica de Jung e a psicanálise freudiana está em que Jung:",
    options: [
      {
        text: "Via a libido como energia psíquica geral, não restrita à pulsão sexual como em Freud",
        isCorrect: true,
      },
      {
        text: "Concordava integralmente com Freud em toda a teoria, sem propor nenhuma divergência real",
        isCorrect: false,
      },
      {
        text: "Negava por completo a existência de qualquer inconsciente, ao contrário do que Freud defendia",
        isCorrect: false,
      },
      {
        text: "Foi o primeiro a propor o conceito de inconsciente, que Freud teria copiado depois dele",
        isCorrect: false,
      },
    ],
    explanation:
      "Um dos pontos centrais do rompimento entre Jung e Freud foi a ampliação do conceito de libido: para Jung, energia psíquica geral, não restrita à sexualidade.",
  },

  // ---- Skinner — Condicionamento Operante ------------------------------
  {
    conceptSlug: "condicionamento-operante",
    difficulty: "INICIANTE",
    prompt: "No condicionamento operante de Skinner, um reforço positivo é:",
    options: [
      {
        text: "A adição de um estímulo agradável após um comportamento, que aumenta a chance dele se repetir",
        isCorrect: true,
      },
      {
        text: "A remoção de um estímulo desagradável, que também aumenta a chance do comportamento se repetir",
        isCorrect: false,
      },
      {
        text: "Qualquer consequência que sempre diminui a frequência de um comportamento no futuro",
        isCorrect: false,
      },
      {
        text: "Um estímulo neutro apresentado antes do comportamento acontecer, sem nenhuma consequência",
        isCorrect: false,
      },
    ],
    explanation:
      "Reforço positivo é ADICIONAR algo agradável depois do comportamento (ex.: um elogio), aumentando a probabilidade de repetição — diferente do reforço negativo, que REMOVE algo desagradável.",
  },
  {
    conceptSlug: "condicionamento-operante",
    difficulty: "BASICO",
    prompt: "A diferença entre reforço negativo e punição no condicionamento operante é que:",
    options: [
      {
        text: "Reforço negativo aumenta um comportamento removendo algo ruim; punição diminui um comportamento",
        isCorrect: true,
      },
      {
        text: "Os dois termos significam exatamente a mesma coisa, só com nomes técnicos diferentes",
        isCorrect: false,
      },
      {
        text: "Reforço negativo sempre usa dor física, enquanto punição nunca envolve nenhum tipo de estímulo aversivo ao organismo",
        isCorrect: false,
      },
      {
        text: "Punição sempre aumenta a frequência de um comportamento, do mesmo jeito que o reforço",
        isCorrect: false,
      },
    ],
    explanation:
      "Reforço negativo AUMENTA um comportamento (remove algo aversivo, ex.: apertar o cinto pra parar o alarme). Punição DIMINUI um comportamento — são efeitos opostos, apesar do nome parecido.",
  },
  {
    conceptSlug: "condicionamento-operante",
    difficulty: "INTERMEDIARIO",
    prompt: "Um esquema de reforço de 'razão variável' (ex.: caça-níqueis) é notável por:",
    options: [
      {
        text: "Produzir respostas muito resistentes à extinção, por causa da imprevisibilidade do reforço",
        isCorrect: true,
      },
      {
        text: "Ser o esquema mais fácil de extinguir entre todos os estudados por Skinner em seus experimentos",
        isCorrect: false,
      },
      {
        text: "Reforçar o comportamento em intervalos de tempo fixos e sempre previsíveis, nunca variáveis",
        isCorrect: false,
      },
      {
        text: "Não ter nenhuma relação com jogos de azar ou qualquer comportamento humano real do dia a dia",
        isCorrect: false,
      },
    ],
    explanation:
      "Esquemas de razão variável (o reforço vem depois de um número IMPREVISÍVEL de respostas) geram comportamentos muito persistentes e resistentes à extinção — daí o apelo de jogos de azar.",
  },
  {
    conceptSlug: "condicionamento-operante",
    difficulty: "AVANCADO",
    prompt:
      "Uma crítica ao behaviorismo radical de Skinner, feita por autores cognitivistas, é que ele:",
    options: [
      {
        text: "Minimizava processos mentais internos (como representações e linguagem) como objeto legítimo de estudo",
        isCorrect: true,
      },
      {
        text: "Nunca realizou nenhum experimento controlado, baseando toda a teoria só em especulação filosófica pessoal",
        isCorrect: false,
      },
      {
        text: "Defendia que o comportamento humano é determinado exclusivamente por fatores genéticos herdados",
        isCorrect: false,
      },
      {
        text: "Concordava plenamente com Chomsky sobre a aquisição da linguagem, sem nenhuma divergência real",
        isCorrect: false,
      },
    ],
    explanation:
      "Noam Chomsky, entre outros, criticou o behaviorismo skinneriano (inclusive sua explicação da linguagem em 'Verbal Behavior') por ignorar estruturas mentais internas — um debate que ajudou a abrir espaço para a psicologia cognitiva.",
  },

  // ---- Piaget — Estágios do Desenvolvimento Cognitivo ------------------
  {
    conceptSlug: "estagios-do-desenvolvimento-cognitivo",
    difficulty: "INICIANTE",
    prompt: "Segundo Piaget, no estágio sensório-motor (0 a ~2 anos), o bebê:",
    options: [
      {
        text: "Constrói o conhecimento principalmente através dos sentidos e de ações motoras sobre o ambiente",
        isCorrect: true,
      },
      {
        text: "Já raciocina de forma abstrata sobre conceitos hipotéticos, sem precisar de nenhum objeto concreto",
        isCorrect: false,
      },
      {
        text: "Domina completamente a lógica formal, igual a um adolescente ou adulto já desenvolvido",
        isCorrect: false,
      },
      {
        text: "Não aprende absolutamente nada até completar dois anos de idade, segundo essa teoria",
        isCorrect: false,
      },
    ],
    explanation:
      "No estágio sensório-motor, o bebê conhece o mundo por meio de ações físicas e percepções sensoriais diretas — a inteligência ainda é prática, não representacional/abstrata.",
  },
  {
    conceptSlug: "estagios-do-desenvolvimento-cognitivo",
    difficulty: "BASICO",
    prompt:
      "A 'permanência do objeto', conquista típica do fim do estágio sensório-motor, é a capacidade de:",
    options: [
      {
        text: "Entender que um objeto continua existindo mesmo quando sai do campo de visão da criança",
        isCorrect: true,
      },
      {
        text: "Guardar um objeto físico em um lugar fixo e nunca mais trocá-lo de posição depois disso",
        isCorrect: false,
      },
      {
        text: "Memorizar o nome de vários objetos diferentes em uma lista, sem nenhuma relação com percepção",
        isCorrect: false,
      },
      {
        text: "Reconhecer objetos apenas pelo som que eles fazem, ignorando completamente a visão",
        isCorrect: false,
      },
    ],
    explanation:
      "Antes de desenvolver a permanência do objeto, o bebê age como se o objeto deixasse de existir quando escondido ('fora da vista, fora da mente') — uma conquista cognitiva importante.",
  },
  {
    conceptSlug: "estagios-do-desenvolvimento-cognitivo",
    difficulty: "INTERMEDIARIO",
    prompt:
      "O 'egocentrismo infantil' no estágio pré-operatório (Piaget) se refere à dificuldade da criança de:",
    options: [
      {
        text: "Considerar um ponto de vista diferente do próprio — não é sinônimo de egoísmo moral",
        isCorrect: true,
      },
      {
        text: "Ser generosa e dividir seus brinquedos com outras crianças durante brincadeiras em grupo",
        isCorrect: false,
      },
      {
        text: "Falar sobre si mesma em conversas cotidianas com adultos ou outras crianças",
        isCorrect: false,
      },
      {
        text: "Sentir qualquer tipo de empatia por outra pessoa, mesmo fisicamente presente diante dela",
        isCorrect: false,
      },
    ],
    explanation:
      "Egocentrismo, em Piaget, é uma limitação COGNITIVA (dificuldade de descentrar, considerar a perspectiva alheia) — não tem o sentido moral de 'egoísmo' usado na linguagem comum.",
  },
  {
    conceptSlug: "estagios-do-desenvolvimento-cognitivo",
    difficulty: "AVANCADO",
    prompt: "Uma crítica empírica influente à teoria dos estágios de Piaget é que:",
    options: [
      {
        text: "Estudos posteriores (ex.: com métodos mais simples) mostraram competências cognitivas mais precoces do que Piaget estimava",
        isCorrect: true,
      },
      {
        text: "Nenhum pesquisador jamais replicou qualquer experimento de Piaget em mais de um século de estudos",
        isCorrect: false,
      },
      {
        text: "A teoria foi inteiramente confirmada sem nenhuma ressalva por toda a comunidade científica posterior",
        isCorrect: false,
      },
      {
        text: "Piaget nunca observou nenhuma criança real, baseando a teoria inteira apenas em raciocínio filosófico abstrato e especulativo",
        isCorrect: false,
      },
    ],
    explanation:
      "Pesquisadores como Renée Baillargeon, usando tarefas adaptadas (ex.: tempo de olhar), encontraram evidências de competências cognitivas (como noções de permanência do objeto) mais cedo do que Piaget previa com suas tarefas originais.",
  },

  // ---- Rogers — Tendência à Autorrealização ----------------------------
  {
    conceptSlug: "tendencia-a-autorrealizacao",
    difficulty: "INICIANTE",
    prompt: "Para Carl Rogers, a 'tendência à autorrealização' é:",
    options: [
      {
        text: "Uma tendência inata de todo organismo de se desenvolver e realizar seu potencial pleno",
        isCorrect: true,
      },
      {
        text: "Um objetivo alcançado só por um pequeno grupo de pessoas excepcionalmente talentosas ou privilegiadas",
        isCorrect: false,
      },
      {
        text: "Um sintoma clínico associado exclusivamente a quadros de ansiedade generalizada",
        isCorrect: false,
      },
      {
        text: "Uma técnica específica de condicionamento comportamental usada em terapia infantil",
        isCorrect: false,
      },
    ],
    explanation:
      "Rogers via a autorrealização como uma força motivacional inerente a todo ser vivo, não um privilégio de poucos — a terapia centrada na pessoa busca remover obstáculos a essa tendência natural.",
  },
  {
    conceptSlug: "tendencia-a-autorrealizacao",
    difficulty: "BASICO",
    prompt: "Na abordagem centrada na pessoa de Rogers, a 'consideração positiva incondicional' é:",
    options: [
      {
        text: "Aceitar o cliente sem julgamento, independentemente do que ele sinta, pense ou diga na terapia",
        isCorrect: true,
      },
      {
        text: "Elogiar apenas os comportamentos do cliente que o terapeuta considera moralmente corretos ou aceitáveis",
        isCorrect: false,
      },
      {
        text: "Uma técnica de recompensa material dada ao cliente quando ele atinge metas específicas",
        isCorrect: false,
      },
      {
        text: "Uma exigência de que o cliente sempre concorde com tudo o que o terapeuta sugere ou opina",
        isCorrect: false,
      },
    ],
    explanation:
      "É uma das três condições centrais de Rogers para a terapia (junto com empatia e congruência) — aceitar o cliente como pessoa, sem impor condições para essa aceitação.",
  },
  {
    conceptSlug: "tendencia-a-autorrealizacao",
    difficulty: "INTERMEDIARIO",
    prompt: "O conceito de 'incongruência', em Rogers, descreve:",
    options: [
      {
        text: "A distância entre a autoimagem da pessoa e sua experiência real, fonte de sofrimento psicológico",
        isCorrect: true,
      },
      {
        text: "Uma discordância pontual entre duas pessoas diferentes durante uma sessão de terapia conduzida em grupo",
        isCorrect: false,
      },
      {
        text: "Um erro lógico cometido durante um raciocínio matemático formal, sem relação com emoções",
        isCorrect: false,
      },
      {
        text: "A falta de pontualidade de um cliente que chega atrasado às consultas terapêuticas marcadas",
        isCorrect: false,
      },
    ],
    explanation:
      "Incongruência é o descompasso entre o 'self' (como a pessoa se vê) e a experiência real vivida — quanto maior essa distância, maior o sofrimento psicológico, na visão rogeriana.",
  },
  {
    conceptSlug: "tendencia-a-autorrealizacao",
    difficulty: "AVANCADO",
    prompt:
      "Uma crítica comum à abordagem humanista de Rogers, vinda de correntes mais empiristas, é que ela:",
    options: [
      {
        text: "Depende de conceitos (como 'tendência à autorrealização') difíceis de operacionalizar e testar experimentalmente",
        isCorrect: true,
      },
      {
        text: "Foi a primeira e única escola de psicologia a usar qualquer método de pesquisa científica",
        isCorrect: false,
      },
      {
        text: "Nunca influenciou nenhuma outra corrente ou prática clínica depois de Rogers",
        isCorrect: false,
      },
      {
        text: "Rejeitava completamente qualquer forma de terapia baseada em conversa entre terapeuta e cliente, sem nenhuma exceção possível",
        isCorrect: false,
      },
    ],
    explanation:
      "Críticos apontam que conceitos humanistas centrais, como a 'tendência à autorrealização', são difíceis de definir operacionalmente e testar com o rigor exigido por correntes mais experimentais da psicologia.",
  },

  // ---- Bandura — Autoeficácia -------------------------------------------
  {
    conceptSlug: "autoeficacia",
    difficulty: "INICIANTE",
    prompt: "Segundo Bandura, 'autoeficácia' é:",
    options: [
      {
        text: "A crença de uma pessoa em sua própria capacidade de realizar as ações necessárias para um objetivo",
        isCorrect: true,
      },
      {
        text: "O resultado real, medido objetivamente, de uma tarefa que a pessoa já realizou no passado",
        isCorrect: false,
      },
      {
        text: "Um traço de personalidade fixo, presente desde o nascimento, que nunca muda em nenhuma fase da vida",
        isCorrect: false,
      },
      {
        text: "Um diagnóstico clínico formal usado para classificar transtornos de ansiedade específicos",
        isCorrect: false,
      },
    ],
    explanation:
      "Autoeficácia é uma CRENÇA subjetiva sobre a própria capacidade — distinta da capacidade real em si — e influencia motivação, persistência e escolha de tarefas.",
  },
  {
    conceptSlug: "autoeficacia",
    difficulty: "BASICO",
    prompt:
      "A 'aprendizagem por observação' (modelação), central na teoria social cognitiva de Bandura, ocorre quando:",
    options: [
      {
        text: "Uma pessoa aprende um comportamento observando outra pessoa realizá-lo, sem precisar ser reforçada diretamente",
        isCorrect: true,
      },
      {
        text: "Uma pessoa só aprende algo depois de repetir sozinha o mesmo comportamento centenas de vezes seguidas",
        isCorrect: false,
      },
      {
        text: "Um comportamento é aprendido exclusivamente através de reforço direto administrado por um experimentador treinado",
        isCorrect: false,
      },
      {
        text: "Uma pessoa lê um livro teórico sobre um comportamento, sem nunca observar ninguém realizá-lo de fato",
        isCorrect: false,
      },
    ],
    explanation:
      "O experimento do 'boneco Bobo' de Bandura mostrou que crianças imitavam comportamentos agressivos só de OBSERVAR um modelo — aprendizagem que não depende de reforço direto ao próprio observador.",
  },
  {
    conceptSlug: "autoeficacia",
    difficulty: "INTERMEDIARIO",
    prompt:
      "Uma das quatro fontes de autoeficácia descritas por Bandura, 'experiências vicárias', se refere a:",
    options: [
      {
        text: "Observar outras pessoas parecidas obtendo sucesso, o que fortalece a crença na própria capacidade",
        isCorrect: true,
      },
      {
        text: "Sentir sintomas físicos de ansiedade momentos antes de realizar uma tarefa importante",
        isCorrect: false,
      },
      {
        text: "Ter alcançado pessoalmente um sucesso real e direto em uma tentativa anterior da mesma tarefa exata",
        isCorrect: false,
      },
      {
        text: "Receber um elogio verbal de um professor ou treinador logo depois de realizar a tarefa",
        isCorrect: false,
      },
    ],
    explanation:
      "Bandura descreveu 4 fontes de autoeficácia: experiências de domínio (própria conquista), vicárias (ver outros parecidos conseguirem), persuasão social (encorajamento) e estados fisiológicos/emocionais.",
  },
  {
    conceptSlug: "autoeficacia",
    difficulty: "AVANCADO",
    prompt:
      "O conceito de 'determinismo recíproco' na teoria social cognitiva de Bandura propõe que:",
    options: [
      {
        text: "Comportamento, fatores pessoais/cognitivos e ambiente se influenciam mutuamente, não numa via só de causa e efeito",
        isCorrect: true,
      },
      {
        text: "O ambiente determina sozinho todo o comportamento humano, sem nenhuma influência de quaisquer fatores internos da própria pessoa",
        isCorrect: false,
      },
      {
        text: "Fatores cognitivos internos determinam sozinhos o comportamento, sem nenhuma influência do ambiente",
        isCorrect: false,
      },
      {
        text: "Comportamento e ambiente nunca se relacionam de nenhuma forma, sendo completamente independentes",
        isCorrect: false,
      },
    ],
    explanation:
      "Determinismo recíproco é a ideia de que pessoa (cognição/crenças), comportamento e ambiente interagem em via de mão dupla — nenhum dos três é o único fator causal, diferente do behaviorismo mais estrito.",
  },

  // ---- Pavlov — Condicionamento Clássico --------------------------------
  {
    conceptSlug: "condicionamento-classico",
    difficulty: "INICIANTE",
    prompt:
      "No experimento clássico de Pavlov, o estímulo neutro que passou a provocar salivação foi:",
    options: [
      {
        text: "O som de um sino, associado repetidamente à apresentação de comida ao cão",
        isCorrect: true,
      },
      {
        text: "A própria comida, que já naturalmente provocava salivação mesmo sem nenhum treino prévio",
        isCorrect: false,
      },
      {
        text: "A luz do laboratório, que nunca foi de fato utilizada em nenhuma etapa do experimento",
        isCorrect: false,
      },
      {
        text: "O toque físico do pesquisador na pata do cão, sem nenhuma associação sonora envolvida",
        isCorrect: false,
      },
    ],
    explanation:
      "O sino (estímulo neutro) foi pareado repetidamente com a comida (estímulo incondicionado) até passar a provocar salivação sozinho — virando um estímulo condicionado.",
  },
  {
    conceptSlug: "condicionamento-classico",
    difficulty: "BASICO",
    prompt: "No condicionamento clássico, a 'extinção' de uma resposta condicionada ocorre quando:",
    options: [
      {
        text: "O estímulo condicionado é repetidamente apresentado sem o estímulo incondicionado, enfraquecendo a resposta",
        isCorrect: true,
      },
      {
        text: "O animal morre durante o experimento, sendo essa a única forma possível de extinguir uma resposta condicionada",
        isCorrect: false,
      },
      {
        text: "O estímulo incondicionado é apresentado com intensidade cada vez maior a cada nova tentativa",
        isCorrect: false,
      },
      {
        text: "Um novo estímulo completamente diferente é introduzido junto ao estímulo condicionado original",
        isCorrect: false,
      },
    ],
    explanation:
      "Extinção acontece quando o estímulo condicionado (ex.: o sino) deixa de vir acompanhado do incondicionado (a comida) repetidamente — a resposta condicionada (salivar ao sino) enfraquece com o tempo.",
  },
  {
    conceptSlug: "condicionamento-classico",
    difficulty: "INTERMEDIARIO",
    prompt: "'Generalização de estímulo', no condicionamento clássico, ocorre quando:",
    options: [
      {
        text: "Um estímulo parecido, mas não idêntico, ao condicionado original também passa a provocar a resposta",
        isCorrect: true,
      },
      {
        text: "A resposta condicionada desaparece completamente e para sempre após a primeira repetição do próprio teste",
        isCorrect: false,
      },
      {
        text: "O animal aprende a distinguir com perfeição total dois estímulos extremamente parecidos entre si",
        isCorrect: false,
      },
      {
        text: "Um comportamento é reforçado apenas quando ocorre em um único contexto físico específico e fixo",
        isCorrect: false,
      },
    ],
    explanation:
      "Generalização é quando estímulos SEMELHANTES ao original (ex.: um som parecido com o sino) também disparam a resposta condicionada — o oposto é a 'discriminação', quando o organismo aprende a diferenciá-los.",
  },
  {
    conceptSlug: "condicionamento-classico",
    difficulty: "AVANCADO",
    prompt:
      "Uma diferença conceitual central entre o condicionamento clássico (Pavlov) e o operante (Skinner) é que:",
    options: [
      {
        text: "No clássico a resposta é reflexa/involuntária; no operante ela é ativa e modelada por suas consequências",
        isCorrect: true,
      },
      {
        text: "Os dois processos são idênticos e Skinner só renomeou a teoria de Pavlov sem mudar nada de fato",
        isCorrect: false,
      },
      {
        text: "O condicionamento operante só funciona em cães, enquanto o clássico funciona em qualquer espécie",
        isCorrect: false,
      },
      {
        text: "O condicionamento clássico sempre exige linguagem verbal, ao contrário do operante, que nunca exige nada disso",
        isCorrect: false,
      },
    ],
    explanation:
      "No condicionamento clássico, associa-se um estímulo a uma resposta REFLEXA já existente (salivar). No operante, o comportamento é ATIVO e sua frequência muda conforme as consequências (reforço/punição) — mecanismos distintos.",
  },

  // ---- Watson — Condicionamento do Medo (Pequeno Albert) ----------------
  {
    conceptSlug: "condicionamento-do-medo",
    difficulty: "INICIANTE",
    prompt:
      "No experimento do 'Pequeno Albert', conduzido por Watson, o medo foi condicionado associando:",
    options: [
      {
        text: "Um rato branco a um barulho alto e assustador, feito logo depois que a criança tocava e brincava com o animal",
        isCorrect: true,
      },
      {
        text: "Uma luz colorida a um cheiro agradável de comida, sem nenhum tipo de barulho envolvido em todo o procedimento experimental",
        isCorrect: false,
      },
      {
        text: "Um brinquedo qualquer a um elogio verbal feito pelos próprios pais da criança durante o teste",
        isCorrect: false,
      },
      {
        text: "Uma música suave a uma sensação física de conforto e relaxamento profundo do bebê",
        isCorrect: false,
      },
    ],
    explanation:
      "Watson e Rosalie Rayner pareavam repetidamente o rato branco (estímulo neutro) a um barulho alto e assustador (estímulo incondicionado), até Albert passar a temer o rato sozinho.",
  },
  {
    conceptSlug: "condicionamento-do-medo",
    difficulty: "BASICO",
    prompt: "O experimento do Pequeno Albert foi usado por Watson para defender que:",
    options: [
      {
        text: "Emoções como o medo também podem ser aprendidas por condicionamento, não só reflexos físicos simples",
        isCorrect: true,
      },
      {
        text: "O medo é sempre uma emoção puramente inata, nunca influenciada por nenhuma experiência de aprendizagem",
        isCorrect: false,
      },
      {
        text: "Apenas animais, nunca seres humanos, conseguem ser condicionados a sentir qualquer tipo de medo",
        isCorrect: false,
      },
      {
        text: "Bebês são incapazes de aprender absolutamente qualquer coisa antes de completar cinco anos de idade",
        isCorrect: false,
      },
    ],
    explanation:
      "Watson queria mostrar que emoções complexas, como o medo, podiam ser condicionadas do mesmo jeito que reflexos simples — sustentando sua visão behaviorista de que o comportamento é moldado pelo ambiente.",
  },
  {
    conceptSlug: "condicionamento-do-medo",
    difficulty: "INTERMEDIARIO",
    prompt:
      "No caso do Pequeno Albert, o fato de a criança passar a temer também um coelho branco (parecido com o rato) ilustra o fenômeno de:",
    options: [
      {
        text: "Generalização de estímulo — o medo se estendeu a estímulos fisicamente parecidos com o original",
        isCorrect: true,
      },
      {
        text: "Extinção total e imediata da resposta de medo, que teria desaparecido completamente naquele momento",
        isCorrect: false,
      },
      {
        text: "Reforço positivo direto, aplicado deliberadamente pelos pesquisadores usando o coelho como recompensa",
        isCorrect: false,
      },
      {
        text: "Um comportamento inato presente desde o nascimento, sem nenhuma relação com o condicionamento anterior",
        isCorrect: false,
      },
    ],
    explanation:
      "O medo condicionado ao rato se generalizou para outros estímulos com características semelhantes (peludos, brancos) — o coelho, um casaco de pele — um exemplo clássico de generalização de estímulo.",
  },
  {
    conceptSlug: "condicionamento-do-medo",
    difficulty: "AVANCADO",
    prompt:
      "Uma crítica ética séria, feita retrospectivamente ao experimento do Pequeno Albert, é que:",
    options: [
      {
        text: "O medo condicionado nunca foi revertido/tratado no bebê, algo inaceitável pelos padrões éticos atuais de pesquisa",
        isCorrect: true,
      },
      {
        text: "O experimento nunca foi de fato realizado, sendo hoje considerado apenas uma lenda urbana sem nenhuma base histórica real",
        isCorrect: false,
      },
      {
        text: "Watson pediu consentimento informado por escrito da família antes de iniciar qualquer etapa do estudo",
        isCorrect: false,
      },
      {
        text: "O estudo foi conduzido seguindo rigorosamente os mesmos padrões éticos usados em pesquisas atuais com crianças",
        isCorrect: false,
      },
    ],
    explanation:
      "Watson não realizou (ou não documentou) uma reversão do condicionamento antes de a família deixar o estudo — um problema ético grave sob os padrões de pesquisa atuais, que exigem descondicionar reações nocivas induzidas.",
  },

  // ---- Wundt — Introspecção Experimental ---------------------------------
  {
    conceptSlug: "introspeccao-experimental",
    difficulty: "INICIANTE",
    prompt: "Wilhelm Wundt é considerado importante para a psicologia principalmente por ter:",
    options: [
      {
        text: "Fundado o primeiro laboratório de psicologia experimental, em Leipzig, em 1879",
        isCorrect: true,
      },
      {
        text: "Sido o primeiro psicanalista da história, antes mesmo de Freud iniciar sua própria teoria",
        isCorrect: false,
      },
      {
        text: "Inventado sozinho o conceito de inconsciente, décadas antes de qualquer outro autor da área",
        isCorrect: false,
      },
      {
        text: "Criado a teoria dos estágios do desenvolvimento infantil, mais tarde associada a Jean Piaget",
        isCorrect: false,
      },
    ],
    explanation:
      "Wundt fundou, em 1879, o primeiro laboratório dedicado à psicologia como ciência experimental — um marco geralmente citado como o nascimento formal da psicologia científica.",
  },
  {
    conceptSlug: "introspeccao-experimental",
    difficulty: "BASICO",
    prompt:
      "A 'introspecção experimental' de Wundt se diferenciava da introspecção comum do dia a dia por ser:",
    options: [
      {
        text: "Conduzida por observadores treinados, em condições controladas e padronizadas de laboratório",
        isCorrect: true,
      },
      {
        text: "Feita sem nenhum tipo de treino prévio, por qualquer pessoa, em qualquer ambiente do cotidiano",
        isCorrect: false,
      },
      {
        text: "Realizada exclusivamente em sonhos relatados pelo paciente ao acordar, sem nenhum controle experimental",
        isCorrect: false,
      },
      {
        text: "Baseada apenas na observação do comportamento externo, sem nenhum relato verbal da própria experiência",
        isCorrect: false,
      },
    ],
    explanation:
      "Diferente de uma auto-observação informal e espontânea, a introspecção de Wundt era feita por observadores treinados, diante de estímulos controlados e repetíveis em laboratório.",
  },
  {
    conceptSlug: "introspeccao-experimental",
    difficulty: "INTERMEDIARIO",
    prompt:
      "O 'estruturalismo', escola associada aos discípulos de Wundt (como Titchener), buscava principalmente:",
    options: [
      {
        text: "Identificar os elementos básicos da consciência (sensações, sentimentos, imagens) por introspecção",
        isCorrect: true,
      },
      {
        text: "Estudar exclusivamente o comportamento observável, ignorando completamente qualquer processo mental interno",
        isCorrect: false,
      },
      {
        text: "Investigar a função adaptativa da mente no ambiente, tema mais associado ao funcionalismo de William James",
        isCorrect: false,
      },
      {
        text: "Tratar transtornos mentais através de terapia clínica individual, sem nenhum interesse em pesquisa básica",
        isCorrect: false,
      },
    ],
    explanation:
      "O estruturalismo buscava decompor a consciência em seus elementos mais básicos (como um químico decompõe substâncias) — diferente do funcionalismo, mais interessado no 'para quê' da mente.",
  },
  {
    conceptSlug: "introspeccao-experimental",
    difficulty: "AVANCADO",
    prompt:
      "Uma limitação apontada no método introspectivo de Wundt, que ajudou a abrir espaço para o behaviorismo depois, foi que:",
    options: [
      {
        text: "Relatos introspectivos de observadores diferentes muitas vezes divergiam, dificultando a replicação dos resultados",
        isCorrect: true,
      },
      {
        text: "O método nunca foi usado por absolutamente nenhum outro pesquisador além do próprio Wundt em toda a sua longa e extensa carreira",
        isCorrect: false,
      },
      {
        text: "A introspecção produzia sempre resultados idênticos entre diferentes laboratórios, sem nenhuma variação",
        isCorrect: false,
      },
      {
        text: "O método dependia inteiramente de animais de laboratório, nunca de relatos verbais humanos",
        isCorrect: false,
      },
    ],
    explanation:
      "A subjetividade e a baixa replicabilidade dos relatos introspectivos (dependentes do observador) foram críticas centrais que, décadas depois, ajudaram a justificar a virada behaviorista rumo ao comportamento observável.",
  },

  // ---- William James — Fluxo de Consciência ------------------------------
  {
    conceptSlug: "fluxo-de-consciencia",
    difficulty: "INICIANTE",
    prompt:
      "William James descreveu a consciência como um 'fluxo' (stream of consciousness) para enfatizar que ela é:",
    options: [
      {
        text: "Contínua e em constante mudança, não uma sequência de elementos fixos e separados entre si",
        isCorrect: true,
      },
      {
        text: "Composta por blocos fixos e estáticos, exatamente como pequenos tijolos empilhados um sobre o outro",
        isCorrect: false,
      },
      {
        text: "Idêntica em todas as pessoas, sem nenhuma variação individual entre diferentes indivíduos",
        isCorrect: false,
      },
      {
        text: "Completamente ausente durante o sono, inclusive durante toda a fase de sonhos",
        isCorrect: false,
      },
    ],
    explanation:
      "James se opunha à ideia estruturalista de decompor a mente em 'elementos' isolados — para ele, a experiência consciente é um fluxo contínuo, pessoal e sempre em mudança.",
  },
  {
    conceptSlug: "fluxo-de-consciencia",
    difficulty: "BASICO",
    prompt: "O funcionalismo de William James se interessava principalmente por:",
    options: [
      {
        text: "Qual a função/utilidade adaptativa de um processo mental para a vida da pessoa em seu ambiente",
        isCorrect: true,
      },
      {
        text: "Decompor a mente em elementos básicos fixos, sem nenhuma preocupação com sua utilidade prática real",
        isCorrect: false,
      },
      {
        text: "Tratar exclusivamente transtornos mentais graves através de intervenção medicamentosa direta",
        isCorrect: false,
      },
      {
        text: "Estudar apenas o comportamento de animais em laboratório, nunca a experiência subjetiva humana em si",
        isCorrect: false,
      },
    ],
    explanation:
      "Diferente do estruturalismo (o que é a mente), o funcionalismo de James perguntava para que serve — qual a função de um processo mental na adaptação da pessoa ao ambiente.",
  },
  {
    conceptSlug: "fluxo-de-consciencia",
    difficulty: "INTERMEDIARIO",
    prompt: "A teoria de James-Lange sobre emoção propõe que:",
    options: [
      {
        text: "A reação corporal (ex.: coração acelerado) vem primeiro, e a emoção sentida é a percepção dessa reação",
        isCorrect: true,
      },
      {
        text: "A emoção sempre acontece primeiro na mente, e só depois o corpo reage fisicamente a ela",
        isCorrect: false,
      },
      {
        text: "Emoção e reação corporal nunca têm nenhuma relação uma com a outra, sendo processos totalmente separados",
        isCorrect: false,
      },
      {
        text: "Todas as emoções humanas são aprendidas por condicionamento clássico, sem nenhum componente inato",
        isCorrect: false,
      },
    ],
    explanation:
      "Diferente do senso comum ('sinto medo, por isso meu coração dispara'), James (e Carl Lange, independentemente) propuseram o inverso: a percepção da reação corporal É a experiência emocional.",
  },
  {
    conceptSlug: "fluxo-de-consciencia",
    difficulty: "AVANCADO",
    prompt: "Uma crítica comum à teoria de James-Lange sobre emoção é que ela:",
    options: [
      {
        text: "Tem dificuldade em explicar por que reações fisiológicas parecidas produzem emoções muito diferentes",
        isCorrect: true,
      },
      {
        text: "Foi confirmada de forma unânime e definitiva por toda a comunidade científica, sem nenhuma objeção real",
        isCorrect: false,
      },
      {
        text: "Nunca influenciou nenhuma teoria posterior sobre emoção na história da psicologia",
        isCorrect: false,
      },
      {
        text: "Rejeitava por completo qualquer participação do corpo na experiência emocional humana",
        isCorrect: false,
      },
    ],
    explanation:
      "Críticos como Cannon apontaram que reações fisiológicas semelhantes (coração acelerado) ocorrem em emoções bem diferentes (medo, raiva, excitação) — questionando se a reação corporal sozinha explica qual emoção é sentida.",
  },

  // ---- Lewin — Espaço Vital ------------------------------------------------
  {
    conceptSlug: "espaco-vital",
    difficulty: "INICIANTE",
    prompt: "Para Kurt Lewin, o 'espaço vital' de uma pessoa é:",
    options: [
      {
        text: "O conjunto de fatores psicológicos e ambientais que, juntos, influenciam o comportamento em um momento",
        isCorrect: true,
      },
      {
        text: "O tamanho físico, em metros quadrados, da casa onde a pessoa mora com sua família",
        isCorrect: false,
      },
      {
        text: "Um conceito exclusivamente biológico, sobre o espaço físico ocupado pelo corpo humano dentro do ambiente real",
        isCorrect: false,
      },
      {
        text: "A quantidade de amigos e conhecidos que uma pessoa tem em sua rede social direta",
        isCorrect: false,
      },
    ],
    explanation:
      "Lewin resumiu isso na fórmula C = f(P, A): o Comportamento é função da Pessoa e do Ambiente psicológico percebido — o 'espaço vital' é justamente esse campo de forças que envolve a pessoa.",
  },
  {
    conceptSlug: "espaco-vital",
    difficulty: "BASICO",
    prompt:
      "A 'teoria de campo' de Lewin propõe que o comportamento de uma pessoa em um dado momento é resultado de:",
    options: [
      {
        text: "Uma interação entre a pessoa e seu ambiente psicológico percebido naquele momento específico",
        isCorrect: true,
      },
      {
        text: "Apenas traços de personalidade fixos, formados unicamente na primeira infância da pessoa",
        isCorrect: false,
      },
      {
        text: "Somente estímulos externos, sem nenhuma influência de fatores internos da própria pessoa",
        isCorrect: false,
      },
      {
        text: "Um destino biológico predeterminado geneticamente, sem nenhuma influência do ambiente atual da pessoa",
        isCorrect: false,
      },
    ],
    explanation:
      "A 'teoria de campo' via o comportamento como resultado da interação DINÂMICA entre pessoa e ambiente naquele momento — não algo fixado só por traços internos ou só por estímulos externos isolados.",
  },
  {
    conceptSlug: "espaco-vital",
    difficulty: "INTERMEDIARIO",
    prompt: "A pesquisa-ação, método associado a Lewin, é caracterizada por:",
    options: [
      {
        text: "Ciclos repetidos de planejar, agir, observar e refletir, buscando mudança social real junto com pesquisa",
        isCorrect: true,
      },
      {
        text: "Ser um método puramente teórico, sem nenhuma aplicação prática ou intervenção real no mundo",
        isCorrect: false,
      },
      {
        text: "Exigir que o pesquisador nunca interaja diretamente com as pessoas ou grupos que está estudando, em nenhuma etapa",
        isCorrect: false,
      },
      {
        text: "Ser aplicável apenas em laboratórios controlados, nunca em contextos sociais reais e cotidianos",
        isCorrect: false,
      },
    ],
    explanation:
      "A pesquisa-ação de Lewin combina pesquisa e intervenção prática em ciclos (planejar, agir, observar, refletir, e recomeçar), buscando gerar conhecimento E mudança social real ao mesmo tempo.",
  },
  {
    conceptSlug: "espaco-vital",
    difficulty: "AVANCADO",
    prompt:
      "Os estudos de Lewin sobre estilos de liderança (autocrático, democrático, laissez-faire) descobriram que grupos com liderança democrática, em geral, apresentavam:",
    options: [
      {
        text: "Maior satisfação e criatividade sustentada, mesmo que a produtividade inicial fosse às vezes mais lenta",
        isCorrect: true,
      },
      {
        text: "Sempre e exclusivamente a maior produtividade entre os três estilos, sem nenhuma exceção observada em nenhum grupo",
        isCorrect: false,
      },
      {
        text: "Nenhuma diferença mensurável em relação aos grupos com liderança autocrática nos experimentos",
        isCorrect: false,
      },
      {
        text: "Total ausência de conflitos internos, diferente do que ocorria nos outros dois estilos estudados",
        isCorrect: false,
      },
    ],
    explanation:
      "Os clássicos estudos de Lewin, Lippitt e White com grupos de crianças associaram a liderança democrática a maior satisfação e criatividade sustentada — embora a autocrática pudesse, às vezes, gerar mais produtividade imediata sob supervisão.",
  },

  // ---- Vygotsky — Zona de Desenvolvimento Proximal ------------------------
  {
    conceptSlug: "zona-de-desenvolvimento-proximal",
    difficulty: "INICIANTE",
    prompt: "A 'zona de desenvolvimento proximal' de Vygotsky é a distância entre:",
    options: [
      {
        text: "O que a criança já consegue fazer sozinha e o que consegue fazer com ajuda de alguém mais experiente",
        isCorrect: true,
      },
      {
        text: "A idade cronológica real da criança e a idade que ela aparenta ter para outras pessoas",
        isCorrect: false,
      },
      {
        text: "Duas crianças de mesma idade que moram em bairros geograficamente distantes uma da outra",
        isCorrect: false,
      },
      {
        text: "O peso e a altura médios esperados para a idade da criança, segundo tabelas de crescimento físico padronizadas",
        isCorrect: false,
      },
    ],
    explanation:
      "É a faixa entre o desenvolvimento REAL (o que a criança já faz sozinha) e o POTENCIAL (o que consegue fazer com apoio) — terreno fértil para o ensino, segundo Vygotsky.",
  },
  {
    conceptSlug: "zona-de-desenvolvimento-proximal",
    difficulty: "BASICO",
    prompt: "Para Vygotsky, a linguagem tem um papel central no desenvolvimento cognitivo porque:",
    options: [
      {
        text: "É o principal instrumento de mediação entre a criança, a cultura e o próprio pensamento",
        isCorrect: true,
      },
      {
        text: "É apenas uma habilidade motora, sem nenhuma relação direta com processos de pensamento",
        isCorrect: false,
      },
      {
        text: "Surge de forma totalmente independente da interação social, sem influência do ambiente cultural",
        isCorrect: false,
      },
      {
        text: "É exclusiva de adultos, nunca estando presente ou em desenvolvimento durante a infância",
        isCorrect: false,
      },
    ],
    explanation:
      "Para Vygotsky, a linguagem medeia a relação da criança com o mundo e consigo mesma — o 'discurso interno' se torna, progressivamente, a base do próprio pensamento reflexivo.",
  },
  {
    conceptSlug: "zona-de-desenvolvimento-proximal",
    difficulty: "INTERMEDIARIO",
    prompt:
      "O conceito de 'andaime' (scaffolding), associado à teoria sociocultural de Vygotsky, descreve:",
    options: [
      {
        text: "O suporte temporário e ajustável dado por alguém mais experiente, retirado aos poucos conforme a criança avança",
        isCorrect: true,
      },
      {
        text: "Uma estrutura física de metal literalmente usada na construção de escolas e prédios de ensino",
        isCorrect: false,
      },
      {
        text: "Um teste padronizado aplicado sempre ao final de cada ano letivo para medir o desempenho escolar geral da criança",
        isCorrect: false,
      },
      {
        text: "Um castigo disciplinar usado quando a criança comete um erro durante uma atividade escolar",
        isCorrect: false,
      },
    ],
    explanation:
      "Scaffolding (embora o termo em si tenha sido cunhado por autores posteriores inspirados em Vygotsky) é o apoio ajustado que um adulto/par mais experiente oferece, retirado gradualmente à medida que a criança ganha autonomia — atuando na zona de desenvolvimento proximal.",
  },
  {
    conceptSlug: "zona-de-desenvolvimento-proximal",
    difficulty: "AVANCADO",
    prompt:
      "Uma diferença central entre Piaget e Vygotsky sobre desenvolvimento é que, para Vygotsky:",
    options: [
      {
        text: "A aprendizagem, mediada socialmente, pode IMPULSIONAR o desenvolvimento, não apenas segui-lo passivamente",
        isCorrect: true,
      },
      {
        text: "O desenvolvimento cognitivo não depende em nada da interação social, sendo puramente individual e biológico",
        isCorrect: false,
      },
      {
        text: "As duas teorias são idênticas em praticamente todos os seus pontos, sem nenhuma divergência real",
        isCorrect: false,
      },
      {
        text: "A criança se desenvolve em estágios fixos e universais, exatamente como Piaget descrevia",
        isCorrect: false,
      },
    ],
    explanation:
      "Enquanto Piaget via o desenvolvimento como relativamente independente e precedendo a aprendizagem, Vygotsky defendia que a aprendizagem socialmente mediada 'puxa' o desenvolvimento para frente — daí o papel central do ensino e da zona de desenvolvimento proximal.",
  },

  // ---- Erikson — Estágios Psicossociais -----------------------------------
  {
    conceptSlug: "estagios-psicossociais-do-desenvolvimento",
    difficulty: "INICIANTE",
    prompt: "Diferente de Freud, a teoria de Erikson sobre desenvolvimento:",
    options: [
      {
        text: "Se estende por toda a vida, da infância à velhice, não só pela infância",
        isCorrect: true,
      },
      {
        text: "Se aplica apenas aos primeiros cinco anos de vida, exatamente como a teoria psicossexual freudiana",
        isCorrect: false,
      },
      {
        text: "Nega completamente qualquer influência do ambiente social no desenvolvimento da personalidade",
        isCorrect: false,
      },
      {
        text: "Foi desenvolvida décadas antes da teoria de Freud, servindo de base para a psicanálise",
        isCorrect: false,
      },
    ],
    explanation:
      "Erikson propôs 8 estágios psicossociais cobrindo da infância à velhice — uma ampliação importante em relação ao foco quase exclusivo de Freud nos primeiros anos de vida.",
  },
  {
    conceptSlug: "estagios-psicossociais-do-desenvolvimento",
    difficulty: "BASICO",
    prompt:
      "No estágio 'confiança básica versus desconfiança' (primeiro ano de vida), o bebê desenvolve confiança principalmente através de:",
    options: [
      {
        text: "Cuidados consistentes e responsivos do cuidador principal diante de suas necessidades básicas",
        isCorrect: true,
      },
      {
        text: "Estímulos visuais coloridos apresentados repetidamente por qualquer pessoa desconhecida ao bebê",
        isCorrect: false,
      },
      {
        text: "Exercícios físicos de coordenação motora, sem nenhuma relação com o vínculo com o cuidador",
        isCorrect: false,
      },
      {
        text: "Aulas formais de linguagem, algo que um bebê no primeiro ano de vida ainda não consegue acompanhar",
        isCorrect: false,
      },
    ],
    explanation:
      "No primeiro estágio de Erikson, cuidados previsíveis e responsivos ajudam o bebê a desenvolver confiança básica no mundo — a crise oposta (desconfiança) surge de cuidado inconsistente ou negligente.",
  },
  {
    conceptSlug: "estagios-psicossociais-do-desenvolvimento",
    difficulty: "INTERMEDIARIO",
    prompt:
      "O estágio 'identidade versus confusão de papéis', típico da adolescência em Erikson, tem como principal tarefa:",
    options: [
      {
        text: "Explorar diferentes papéis e valores até formar um senso coeso de quem a pessoa é",
        isCorrect: true,
      },
      {
        text: "Escolher definitivamente uma profissão para a vida toda, sem nenhuma possibilidade de mudança futura",
        isCorrect: false,
      },
      {
        text: "Desenvolver a confiança básica no mundo, tarefa já concluída décadas antes, no primeiro ano de vida",
        isCorrect: false,
      },
      {
        text: "Formar vínculos afetivos íntimos e duradouros, tarefa que Erikson associa ao estágio adulto seguinte",
        isCorrect: false,
      },
    ],
    explanation:
      "Na adolescência, segundo Erikson, a pessoa experimenta diferentes identidades (valores, papéis sociais) até consolidar um senso mais estável de identidade — a crise seguinte, intimidade x isolamento, já pertence à vida adulta jovem.",
  },
  {
    conceptSlug: "estagios-psicossociais-do-desenvolvimento",
    difficulty: "AVANCADO",
    prompt: "Uma crítica frequente à teoria dos estágios de Erikson é que ela:",
    options: [
      {
        text: "Foi construída em contexto cultural específico e pode não generalizar igualmente a todas as culturas",
        isCorrect: true,
      },
      {
        text: "Foi inteiramente confirmada por experimentos de laboratório, sem nenhuma base alguma em observação clínica real",
        isCorrect: false,
      },
      {
        text: "Não teve nenhuma influência sobre estudos posteriores de desenvolvimento ao longo da vida",
        isCorrect: false,
      },
      {
        text: "Restringe o desenvolvimento humano apenas à infância, exatamente como a crítica feita a Freud",
        isCorrect: false,
      },
    ],
    explanation:
      "Assim como outras teorias de estágio, a de Erikson é criticada por generalizar uma sequência universal a partir de observações em contextos culturais e históricos específicos, que podem não se aplicar igualmente a todas as sociedades.",
  },

  // ---- Ainsworth — Situação Estranha e Apego -------------------------------
  {
    conceptSlug: "situacao-estranha-e-padroes-de-apego",
    difficulty: "INICIANTE",
    prompt:
      "O procedimento da 'Situação Estranha', criado por Mary Ainsworth, observa principalmente:",
    options: [
      {
        text: "Como o bebê reage a breves separações e reencontros com o cuidador em um ambiente novo",
        isCorrect: true,
      },
      {
        text: "O desempenho da criança em testes de inteligência formal aplicados em sala de aula tradicional",
        isCorrect: false,
      },
      {
        text: "A capacidade de memorização de listas de palavras por crianças em idade escolar",
        isCorrect: false,
      },
      {
        text: "O tempo de reação motora da criança diante de estímulos sonoros repentinos e altos",
        isCorrect: false,
      },
    ],
    explanation:
      "Na Situação Estranha, o bebê passa por episódios estruturados de separação e reencontro com o cuidador (e com um estranho) — o padrão de reação revela o tipo de apego formado.",
  },
  {
    conceptSlug: "situacao-estranha-e-padroes-de-apego",
    difficulty: "BASICO",
    prompt: "Uma criança com 'apego seguro', na classificação de Ainsworth, tipicamente:",
    options: [
      {
        text: "Fica chateada quando o cuidador sai, mas se acalma e volta a explorar o ambiente quando ele retorna",
        isCorrect: true,
      },
      {
        text: "Ignora completamente tanto a saída quanto o retorno do cuidador, sem nenhuma reação emocional visível",
        isCorrect: false,
      },
      {
        text: "Nunca demonstra nenhum tipo de angústia em nenhum momento do procedimento, do início ao fim",
        isCorrect: false,
      },
      {
        text: "Reage exatamente da mesma forma a um estranho e ao próprio cuidador, sem nenhuma diferenciação",
        isCorrect: false,
      },
    ],
    explanation:
      "Crianças com apego seguro usam o cuidador como 'base segura' — protestam a separação, mas se reconfortam rapidamente no reencontro, retomando a exploração do ambiente com confiança.",
  },
  {
    conceptSlug: "situacao-estranha-e-padroes-de-apego",
    difficulty: "INTERMEDIARIO",
    prompt:
      "O padrão de apego 'ansioso-ambivalente' (ou resistente), descrito por Ainsworth, é caracterizado por:",
    options: [
      {
        text: "Grande angústia na separação e dificuldade de se acalmar mesmo depois do cuidador retornar",
        isCorrect: true,
      },
      {
        text: "Total ausência de qualquer reação emocional, tanto na separação quanto no reencontro com o cuidador",
        isCorrect: false,
      },
      {
        text: "Uma exploração calma e confiante do ambiente, idêntica à observada no apego classificado como seguro",
        isCorrect: false,
      },
      {
        text: "Comportamentos contraditórios e desorganizados, sem nenhum padrão consistente identificável",
        isCorrect: false,
      },
    ],
    explanation:
      "No padrão ansioso-ambivalente, a criança fica muito angustiada com a separação e tem dificuldade de se acalmar no reencontro, muitas vezes alternando entre buscar contato e resistir a ele.",
  },
  {
    conceptSlug: "situacao-estranha-e-padroes-de-apego",
    difficulty: "AVANCADO",
    prompt: "Uma crítica transcultural à Situação Estranha de Ainsworth é que:",
    options: [
      {
        text: "A distribuição dos padrões de apego pode variar conforme normas culturais de criação de filhos, diferentes da amostra original",
        isCorrect: true,
      },
      {
        text: "O procedimento nunca foi replicado em nenhum outro país além dos Estados Unidos desde sua criação",
        isCorrect: false,
      },
      {
        text: "Todos os países do mundo, sem nenhuma exceção conhecida, apresentam exatamente a mesma distribuição de padrões de apego já observados",
        isCorrect: false,
      },
      {
        text: "A teoria do apego foi inteiramente abandonada pela comunidade científica pouco depois de ser proposta",
        isCorrect: false,
      },
    ],
    explanation:
      "Estudos transculturais mostraram diferenças na distribuição dos padrões de apego (ex.: no Japão, mais apego ansioso; na Alemanha, mais apego evitativo), levantando a questão de até que ponto normas culturais de criação influenciam os resultados originais, obtidos com amostras norte-americanas.",
  },

  // ---- Klein — Posição Esquizoparanoide e Depressiva -----------------------
  {
    conceptSlug: "posicao-esquizoparanoide-e-depressiva",
    difficulty: "INICIANTE",
    prompt:
      "Para Melanie Klein, na 'posição esquizoparanoide' (fase mais precoce), o bebê tende a perceber o mundo:",
    options: [
      {
        text: "De forma dividida entre objetos totalmente bons e totalmente maus, sem meio-termo",
        isCorrect: true,
      },
      {
        text: "De forma totalmente integrada e realista, exatamente como um adulto perceberia a mesma situação",
        isCorrect: false,
      },
      {
        text: "Sem nenhuma relação emocional com o cuidador, num estado de indiferença afetiva completa",
        isCorrect: false,
      },
      {
        text: "Através exclusivamente da linguagem verbal, já dominada plenamente nessa fase inicial da vida",
        isCorrect: false,
      },
    ],
    explanation:
      "Na posição esquizoparanoide, Klein descreve um mundo interno 'clivado' (dividido) entre objetos bons e maus, sem integração — uma forma de lidar com a ansiedade primitiva do bebê.",
  },
  {
    conceptSlug: "posicao-esquizoparanoide-e-depressiva",
    difficulty: "BASICO",
    prompt:
      "A 'posição depressiva', na teoria kleiniana, representa um avanço porque a criança passa a:",
    options: [
      {
        text: "Integrar aspectos bons e maus da mesma pessoa (ex.: a mãe) em uma única representação mais realista",
        isCorrect: true,
      },
      {
        text: "Deixar de sentir qualquer tipo de ansiedade pelo resto da vida, sem nunca mais recair nesse estado anterior",
        isCorrect: false,
      },
      {
        text: "Voltar exatamente ao mesmo funcionamento da posição esquizoparanoide, sem nenhuma diferença real",
        isCorrect: false,
      },
      {
        text: "Perder completamente o vínculo afetivo que tinha com a mãe ou cuidador principal até então",
        isCorrect: false,
      },
    ],
    explanation:
      "Na posição depressiva, a criança começa a perceber que a mesma pessoa (a mãe) pode ser fonte de satisfação E frustração — uma integração mais realista, que traz também uma nova capacidade de sentir culpa e cuidado pelo outro.",
  },
  {
    conceptSlug: "posicao-esquizoparanoide-e-depressiva",
    difficulty: "INTERMEDIARIO",
    prompt: "Na teoria kleiniana, o mecanismo de 'clivagem' (splitting) serve principalmente para:",
    options: [
      {
        text: "Proteger o bebê de uma ansiedade primitiva insuportável, separando o que é bom do que é ameaçador",
        isCorrect: true,
      },
      {
        text: "Ensinar a criança a ler e escrever palavras simples antes da idade escolar tradicional",
        isCorrect: false,
      },
      {
        text: "Desenvolver a coordenação motora fina necessária para segurar objetos pequenos com precisão",
        isCorrect: false,
      },
      {
        text: "Estabelecer regras sociais explícitas de convivência em grupo, ensinadas diretamente pelos próprios pais",
        isCorrect: false,
      },
    ],
    explanation:
      "A clivagem é vista por Klein como uma defesa primitiva: dividir o objeto (ex.: a mãe) em 'todo bom' e 'todo mau' protege o ego ainda frágil do bebê de uma ansiedade avassaladora demais para ser tolerada de outro jeito.",
  },
  {
    conceptSlug: "posicao-esquizoparanoide-e-depressiva",
    difficulty: "AVANCADO",
    prompt: "Uma diferença importante entre Klein e Freud é que Klein:",
    options: [
      {
        text: "Deu ênfase às relações do bebê com objetos internos desde os primeiros meses, antes do que Freud enfatizava",
        isCorrect: true,
      },
      {
        text: "Rejeitou por completo qualquer conceito de inconsciente, ao contrário do que Freud sempre defendeu",
        isCorrect: false,
      },
      {
        text: "Nunca trabalhou clinicamente com crianças, tendo restringido sua prática exclusivamente a pacientes adultos",
        isCorrect: false,
      },
      {
        text: "Concordava em todos os pontos com Anna Freud sobre como conduzir a análise infantil, sem nenhuma divergência",
        isCorrect: false,
      },
    ],
    explanation:
      "Klein é uma das fundadoras da 'teoria das relações objetais', enfatizando processos psíquicos muito precoces (primeiros meses de vida) e a fantasia inconsciente do bebê em relação a objetos internos — um foco diferente do de Freud, mais centrado em fases posteriores da infância. Klein também teve um debate histórico com Anna Freud sobre a técnica correta de análise infantil.",
  },

  // ---- Winnicott — Objeto Transicional -------------------------------------
  {
    conceptSlug: "objeto-transicional",
    difficulty: "INICIANTE",
    prompt:
      "Para Winnicott, um 'objeto transicional' (como um cobertor ou ursinho de pelúcia) funciona como:",
    options: [
      {
        text: "Uma ponte simbólica entre a dependência total do bebê e sua autonomia crescente",
        isCorrect: true,
      },
      {
        text: "Um brinquedo qualquer, sem nenhum significado psicológico além da simples diversão momentânea",
        isCorrect: false,
      },
      {
        text: "Um substituto permanente e definitivo do vínculo afetivo com a própria mãe ou cuidador",
        isCorrect: false,
      },
      {
        text: "Um sinal claro de que a criança tem algum tipo de atraso sério em seu desenvolvimento emocional",
        isCorrect: false,
      },
    ],
    explanation:
      "O objeto transicional ajuda a criança a suportar a ausência temporária do cuidador — não substitui o vínculo, mas serve de ponte simbólica entre a dependência inicial e a autonomia que vem depois.",
  },
  {
    conceptSlug: "objeto-transicional",
    difficulty: "BASICO",
    prompt: "A ideia de 'mãe suficientemente boa' (good enough mother), de Winnicott, defende que:",
    options: [
      {
        text: "Um cuidado adequado, mas imperfeito, é o que realmente ajuda o bebê a se desenvolver de forma saudável",
        isCorrect: true,
      },
      {
        text: "A mãe precisa ser absolutamente perfeita e nunca falhar em nenhuma necessidade do bebê",
        isCorrect: false,
      },
      {
        text: "Apenas mães biológicas, nunca outros cuidadores, podem exercer essa função de cuidado descrita por Winnicott",
        isCorrect: false,
      },
      {
        text: "Qualquer tipo de cuidado, mesmo o mais negligente possível, é sempre suficiente para o desenvolvimento do bebê",
        isCorrect: false,
      },
    ],
    explanation:
      "Winnicott argumentava que a busca pela perfeição no cuidado é irreal e até prejudicial — pequenas falhas adaptativas, na medida certa, ajudam o bebê a lidar com a frustração e desenvolver seus próprios recursos internos.",
  },
  {
    conceptSlug: "objeto-transicional",
    difficulty: "INTERMEDIARIO",
    prompt: "O conceito de 'espaço potencial' (ou área transicional), de Winnicott, se refere a:",
    options: [
      {
        text: "Uma área intermediária de experiência, entre a realidade interna e a externa, onde o brincar e a criatividade acontecem",
        isCorrect: true,
      },
      {
        text: "Um espaço físico específico e delimitado dentro da casa, reservado exclusivamente para os brinquedos da própria criança pequena",
        isCorrect: false,
      },
      {
        text: "O tempo médio que uma criança leva para aprender a falar suas primeiras palavras completas",
        isCorrect: false,
      },
      {
        text: "Uma medida de inteligência aplicada em testes padronizados de desenvolvimento infantil",
        isCorrect: false,
      },
    ],
    explanation:
      "Para Winnicott, o brincar (e depois a cultura, a arte) acontece nessa área intermediária, potencial, que não é nem puramente interna (fantasia) nem puramente externa (realidade objetiva) — nem por isso menos real.",
  },
  {
    conceptSlug: "objeto-transicional",
    difficulty: "AVANCADO",
    prompt:
      "Winnicott descreveu o 'falso self' como um padrão de personalidade que se desenvolve quando:",
    options: [
      {
        text: "A criança se adapta excessivamente às expectativas do ambiente, escondendo um self verdadeiro e espontâneo",
        isCorrect: true,
      },
      {
        text: "A criança apresenta um distúrbio genético raro, sem nenhuma relação com a qualidade do ambiente de cuidado recebido",
        isCorrect: false,
      },
      {
        text: "A criança é criada em total isolamento social, sem absolutamente nenhum contato humano desde o nascimento",
        isCorrect: false,
      },
      {
        text: "Os pais são excessivamente permissivos, nunca impondo nenhum tipo de limite à criança em nenhuma situação",
        isCorrect: false,
      },
    ],
    explanation:
      "Para Winnicott, um ambiente que não responde adequadamente às necessidades espontâneas do bebê pode levá-lo a construir um 'falso self' — uma fachada de conformidade que protege, mas também esconde, o self verdadeiro.",
  },

  // ---- Anna Freud — Mecanismos de Defesa do Ego ----------------------------
  {
    conceptSlug: "mecanismos-de-defesa-do-ego",
    difficulty: "INICIANTE",
    prompt: "Anna Freud é reconhecida principalmente por ter sistematizado o estudo:",
    options: [
      {
        text: "Dos mecanismos de defesa do ego, como negação, repressão e projeção",
        isCorrect: true,
      },
      {
        text: "Dos estágios do desenvolvimento cognitivo, tema mais associado à obra de Jean Piaget",
        isCorrect: false,
      },
      {
        text: "Do condicionamento operante, conceito central na obra de B. F. Skinner",
        isCorrect: false,
      },
      {
        text: "Da hierarquia das necessidades humanas, ideia central na obra de Abraham Maslow",
        isCorrect: false,
      },
    ],
    explanation:
      "Em 'O Ego e os Mecanismos de Defesa' (1936), Anna Freud organizou e ampliou o catálogo de defesas psíquicas já esboçado por seu pai, Sigmund Freud, tornando-se referência central no tema.",
  },
  {
    conceptSlug: "mecanismos-de-defesa-do-ego",
    difficulty: "BASICO",
    prompt: "A 'negação', como mecanismo de defesa, consiste em:",
    options: [
      {
        text: "Recusar-se a reconhecer uma realidade dolorosa ou ameaçadora, mesmo diante de evidências claras",
        isCorrect: true,
      },
      {
        text: "Atribuir a outra pessoa um sentimento ou impulso que, na verdade, é da própria pessoa",
        isCorrect: false,
      },
      {
        text: "Transformar um impulso inaceitável em uma atividade socialmente valorizada, como a arte",
        isCorrect: false,
      },
      {
        text: "Voltar a um comportamento típico de uma fase anterior do desenvolvimento diante de um estresse forte",
        isCorrect: false,
      },
    ],
    explanation:
      "Negação é recusar a realidade de um fato doloroso ('isso não está acontecendo') — diferente de projeção (atribuir ao outro), sublimação (canalizar para algo valorizado) ou regressão (voltar a um comportamento mais infantil).",
  },
  {
    conceptSlug: "mecanismos-de-defesa-do-ego",
    difficulty: "INTERMEDIARIO",
    prompt: "'Formação reativa', como mecanismo de defesa, ocorre quando uma pessoa:",
    options: [
      {
        text: "Expressa o oposto exagerado de um impulso ou sentimento inaceitável que sente de verdade",
        isCorrect: true,
      },
      {
        text: "Aceita abertamente e sem nenhum conflito um impulso considerado socialmente inadequado",
        isCorrect: false,
      },
      {
        text: "Esquece completamente um evento traumático, sem nenhum sinal indireto de que ele tenha existido de fato",
        isCorrect: false,
      },
      {
        text: "Direciona a raiva sentida por uma pessoa poderosa para uma pessoa mais fraca e indefesa",
        isCorrect: false,
      },
    ],
    explanation:
      "Na formação reativa, um impulso inaceitável (ex.: raiva de alguém) é convertido em seu oposto exagerado (excesso de gentileza) — a pessoa não tem consciência de estar, na verdade, se defendendo do sentimento original.",
  },
  {
    conceptSlug: "mecanismos-de-defesa-do-ego",
    difficulty: "AVANCADO",
    prompt: "Uma contribuição de Anna Freud, além de sistematizar as defesas do ego, foi:",
    options: [
      {
        text: "Ajudar a fundar a psicanálise infantil como um campo técnico próprio, com método adaptado a crianças",
        isCorrect: true,
      },
      {
        text: "Ter sido a primeira pessoa da história a propor qualquer conceito de inconsciente psíquico",
        isCorrect: false,
      },
      {
        text: "Ter rompido totalmente com toda a obra do próprio pai, rejeitando qualquer ideia psicanalítica formulada por ele",
        isCorrect: false,
      },
      {
        text: "Ter fundado sozinha, sem nenhum debate ou divergência teórica, o campo da psicanálise infantil",
        isCorrect: false,
      },
    ],
    explanation:
      "Anna Freud foi pioneira na técnica de análise infantil (com adaptações como o uso do brincar), mas isso envolveu um debate histórico e teórico com Melanie Klein sobre a melhor forma de conduzir a análise com crianças — um marco importante, não isento de disputa.",
  },

  // ---- Karen Horney — Crítica à Inveja do Pênis/Útero ------------------------
  {
    conceptSlug: "critica-a-inveja-do-penis-e-inveja-do-utero",
    difficulty: "INICIANTE",
    prompt:
      "Karen Horney é conhecida por ter criticado, dentro da própria tradição psicanalítica, a ideia freudiana de:",
    options: [
      {
        text: "'Inveja do pênis', que ela via como refletindo um viés cultural machista, não um fato biológico universal",
        isCorrect: true,
      },
      {
        text: "Condicionamento operante, conceito que na verdade nunca fez parte de nenhuma teoria freudiana original ou revisada",
        isCorrect: false,
      },
      {
        text: "Zona de desenvolvimento proximal, ideia que pertence à teoria sociocultural de Vygotsky",
        isCorrect: false,
      },
      {
        text: "Hierarquia das necessidades, conceito que pertence à teoria humanista de Abraham Maslow",
        isCorrect: false,
      },
    ],
    explanation:
      "Horney argumentou que a 'inveja do pênis' freudiana refletia, na verdade, a inveja do PODER e do STATUS social que os homens tinham na cultura da época — não uma inveja biológica universal do órgão em si.",
  },
  {
    conceptSlug: "critica-a-inveja-do-penis-e-inveja-do-utero",
    difficulty: "BASICO",
    prompt: "Em resposta a Freud, Horney propôs o conceito de 'inveja do útero' para sugerir que:",
    options: [
      {
        text: "Homens também podem sentir inveja da capacidade biológica feminina de gerar e amamentar filhos",
        isCorrect: true,
      },
      {
        text: "Apenas mulheres podem sentir qualquer tipo de inveja em relação ao próprio corpo ou ao do outro sexo",
        isCorrect: false,
      },
      {
        text: "A inveja é sempre um sentimento puramente masculino, nunca experimentado por mulheres reais",
        isCorrect: false,
      },
      {
        text: "Não existe nenhuma diferença psicológica relevante entre homens e mulheres, segundo essa proposta",
        isCorrect: false,
      },
    ],
    explanation:
      "Horney propôs, de forma provocativa, que a lógica da 'inveja do pênis' poderia ser invertida: se existe inveja biológica entre sexos, homens também poderiam invejar a capacidade reprodutiva feminina — questionando o viés da teoria original.",
  },
  {
    conceptSlug: "critica-a-inveja-do-penis-e-inveja-do-utero",
    difficulty: "INTERMEDIARIO",
    prompt: "A perspectiva de Horney sobre neurose dava mais peso a:",
    options: [
      {
        text: "Fatores sociais e culturais (como competição e insegurança), não só a pulsões biológicas universais",
        isCorrect: true,
      },
      {
        text: "Exclusivamente fatores genéticos herdados, sem nenhuma influência do ambiente social da pessoa",
        isCorrect: false,
      },
      {
        text: "Exclusivamente o condicionamento comportamental direto, ignorando qualquer processo mental inconsciente",
        isCorrect: false,
      },
      {
        text: "Uma cópia idêntica da teoria pulsional de Freud, sem nenhuma reformulação ou divergência real",
        isCorrect: false,
      },
    ],
    explanation:
      "Horney é associada ao grupo dos 'neofreudianos', que davam mais peso a fatores sociais e culturais (relações interpessoais, competitividade, insegurança) na formação da neurose, e menos ênfase às pulsões biológicas universais propostas por Freud.",
  },
  {
    conceptSlug: "critica-a-inveja-do-penis-e-inveja-do-utero",
    difficulty: "AVANCADO",
    prompt:
      "A obra de Karen Horney é frequentemente citada como uma influência inicial importante para:",
    options: [
      {
        text: "Debates posteriores dentro da psicologia sobre gênero e o viés cultural de teorias psicológicas",
        isCorrect: true,
      },
      {
        text: "A criação do primeiro laboratório de psicologia experimental, mérito historicamente atribuído a Wilhelm Wundt",
        isCorrect: false,
      },
      {
        text: "A teoria dos estágios do desenvolvimento cognitivo, associada principalmente a Jean Piaget",
        isCorrect: false,
      },
      {
        text: "O nascimento do condicionamento clássico, associado aos experimentos de Ivan Pavlov com cães",
        isCorrect: false,
      },
    ],
    explanation:
      "Ao questionar pressupostos de gênero dentro da própria psicanálise, Horney é vista como uma precursora de debates posteriores, dentro e fora da psicologia, sobre viés cultural e de gênero em teorias psicológicas.",
  },

  // ---- Beck — Distorções Cognitivas -----------------------------------------
  {
    conceptSlug: "distorcoes-cognitivas",
    difficulty: "INICIANTE",
    prompt:
      "Aaron Beck, fundador da terapia cognitiva, propôs que emoções perturbadoras estão frequentemente ligadas a:",
    options: [
      {
        text: "Padrões de pensamento distorcidos, não apenas a conflitos inconscientes ou condicionamento passado",
        isCorrect: true,
      },
      {
        text: "Apenas desequilíbrios genéticos herdados, sem nenhuma relação com pensamentos ou crenças da própria pessoa",
        isCorrect: false,
      },
      {
        text: "Exclusivamente experiências traumáticas da primeira infância, sem nenhum papel do pensamento atual",
        isCorrect: false,
      },
      {
        text: "Sempre e apenas fatores puramente sociais e econômicos, nunca processos internos de pensamento",
        isCorrect: false,
      },
    ],
    explanation:
      "Beck propôs que pensamentos distorcidos e automáticos (não apenas conflitos inconscientes, como na psicanálise, ou só condicionamento, como no behaviorismo) têm papel central em quadros como a depressão.",
  },
  {
    conceptSlug: "distorcoes-cognitivas",
    difficulty: "BASICO",
    prompt: "A distorção cognitiva chamada 'catastrofização' consiste em:",
    options: [
      {
        text: "Prever o pior resultado possível para uma situação, mesmo sem evidência real que sustente essa previsão",
        isCorrect: true,
      },
      {
        text: "Avaliar uma situação de forma extremamente realista e equilibrada, sem nenhum exagero emocional envolvido",
        isCorrect: false,
      },
      {
        text: "Lembrar com precisão exata de um evento exatamente como ele aconteceu, sem distorção nenhuma",
        isCorrect: false,
      },
      {
        text: "Buscar ativamente evidências que contradigam uma crença negativa que a pessoa já tinha antes",
        isCorrect: false,
      },
    ],
    explanation:
      "Na catastrofização, a pessoa antecipa o pior cenário possível ('vou ser demitido e nunca mais vou conseguir outro emprego') sem base real proporcional — um dos padrões de pensamento automático descritos por Beck.",
  },
  {
    conceptSlug: "distorcoes-cognitivas",
    difficulty: "INTERMEDIARIO",
    prompt: "Na terapia cognitiva de Beck, a 'reestruturação cognitiva' consiste em:",
    options: [
      {
        text: "Identificar e questionar pensamentos automáticos distorcidos, substituindo-os por interpretações mais realistas",
        isCorrect: true,
      },
      {
        text: "Aplicar choques elétricos controlados para eliminar diretamente um pensamento indesejado da própria mente do paciente",
        isCorrect: false,
      },
      {
        text: "Ignorar completamente qualquer pensamento da pessoa, focando só no comportamento observável dela",
        isCorrect: false,
      },
      {
        text: "Analisar exclusivamente sonhos e lembranças da primeira infância, sem examinar o pensamento atual",
        isCorrect: false,
      },
    ],
    explanation:
      "A reestruturação cognitiva é uma técnica central da terapia de Beck: o terapeuta ajuda o paciente a identificar pensamentos automáticos distorcidos e testá-los contra evidências reais, substituindo-os por interpretações mais equilibradas.",
  },
  {
    conceptSlug: "distorcoes-cognitivas",
    difficulty: "AVANCADO",
    prompt: "A terapia cognitiva de Beck influenciou fortemente o desenvolvimento posterior de:",
    options: [
      {
        text: "Abordagens integradas de terapia cognitivo-comportamental (TCC), hoje amplamente usadas e pesquisadas",
        isCorrect: true,
      },
      {
        text: "A psicanálise clássica freudiana, que teria adotado a terapia de Beck como seu método oficial exclusivo",
        isCorrect: false,
      },
      {
        text: "O behaviorismo radical de Skinner, que Beck teria fundado décadas antes do próprio Skinner nascer",
        isCorrect: false,
      },
      {
        text: "A teoria dos estágios do desenvolvimento de Piaget, sem nenhuma relação real entre os dois autores",
        isCorrect: false,
      },
    ],
    explanation:
      "A terapia cognitiva de Beck, combinada com técnicas comportamentais mais antigas, deu origem à ampla família de abordagens hoje chamadas de Terapia Cognitivo-Comportamental (TCC) — uma das linhas mais pesquisadas e usadas na psicoterapia contemporânea.",
  },

  // ---- Maslow — Hierarquia das Necessidades ---------------------------------
  {
    conceptSlug: "hierarquia-das-necessidades",
    difficulty: "INICIANTE",
    prompt:
      "Na pirâmide de necessidades de Maslow, a base (necessidades mais básicas) é formada por:",
    options: [
      { text: "Necessidades fisiológicas, como fome, sede e sono", isCorrect: true },
      {
        text: "A necessidade de autorrealização, considerada por Maslow o nível mais elevado da pirâmide",
        isCorrect: false,
      },
      {
        text: "A necessidade de estima e reconhecimento social por parte de outras pessoas",
        isCorrect: false,
      },
      {
        text: "A necessidade de pertencimento a um grupo social ou familiar específico",
        isCorrect: false,
      },
    ],
    explanation:
      "Maslow organizou as necessidades humanas numa hierarquia, com as fisiológicas (sobrevivência básica) na base — precisando ser minimamente satisfeitas antes que necessidades mais 'altas' (segurança, pertencimento, estima, autorrealização) ganhem prioridade.",
  },
  {
    conceptSlug: "hierarquia-das-necessidades",
    difficulty: "BASICO",
    prompt: "Segundo Maslow, a 'autorrealização', no topo da pirâmide, se refere a:",
    options: [
      {
        text: "Realizar plenamente o próprio potencial único, tornando-se tudo aquilo que a pessoa é capaz de ser",
        isCorrect: true,
      },
      {
        text: "Acumular a maior quantidade possível de bens materiais e dinheiro ao longo de toda a vida adulta e produtiva",
        isCorrect: false,
      },
      {
        text: "Satisfazer apenas necessidades fisiológicas básicas, como fome e sede, de forma recorrente",
        isCorrect: false,
      },
      {
        text: "Obter aprovação constante de outras pessoas em todas as decisões tomadas na vida adulta",
        isCorrect: false,
      },
    ],
    explanation:
      "Autorrealização, para Maslow, é o processo de realizar o potencial pessoal único de cada indivíduo — não uma conquista material ou de aprovação externa, mas de expressão autêntica das próprias capacidades.",
  },
  {
    conceptSlug: "hierarquia-das-necessidades",
    difficulty: "INTERMEDIARIO",
    prompt: "Maslow chegou a revisar sua própria teoria, sugerindo que a ordem das necessidades:",
    options: [
      {
        text: "Não é totalmente rígida — pessoas diferentes podem priorizar necessidades de formas distintas em certos contextos",
        isCorrect: true,
      },
      {
        text: "É absolutamente fixa e idêntica para todo ser humano, sem nenhuma exceção possível em nenhuma circunstância real",
        isCorrect: false,
      },
      {
        text: "Deve ser sempre percorrida de cima para baixo, começando pela autorrealização antes de qualquer outra necessidade básica",
        isCorrect: false,
      },
      {
        text: "Se aplica apenas a animais não humanos, nunca tendo sido pensada para descrever pessoas",
        isCorrect: false,
      },
    ],
    explanation:
      "Em obras posteriores, Maslow reconheceu que a hierarquia não é uma escada rígida e universal — necessidades podem se sobrepor, e a prioridade entre elas pode variar conforme a pessoa e o contexto cultural.",
  },
  {
    conceptSlug: "hierarquia-das-necessidades",
    difficulty: "AVANCADO",
    prompt: "Uma crítica empírica à hierarquia de necessidades de Maslow é que:",
    options: [
      {
        text: "Estudos transculturais encontraram pouca evidência de que as necessidades sigam essa ordem fixa proposta",
        isCorrect: true,
      },
      {
        text: "A teoria foi confirmada por experimentos controlados de laboratório logo em sua primeira publicação oficial",
        isCorrect: false,
      },
      {
        text: "Nenhum outro autor da psicologia jamais discordou de qualquer parte dessa hierarquia proposta",
        isCorrect: false,
      },
      {
        text: "A teoria se baseou exclusivamente em testes padronizados aplicados a milhares de participantes",
        isCorrect: false,
      },
    ],
    explanation:
      "Pesquisas transculturais (como as de Tay e Diener) encontraram pessoas satisfazendo necessidades 'mais altas' (relações, respeito) mesmo sem terem plenamente satisfeitas as 'mais básicas' — questionando a rigidez da ordem hierárquica original, que Maslow baseou mais em observação clínica do que em testes padronizados em larga escala.",
  },
];

async function main() {
  const actor = await resolveSeedActor();
  const source = await prisma.source.findFirstOrThrow({
    where: { name: { contains: "autoral" } },
  });

  let created = 0;
  let skipped = 0;

  for (const q of QUESTIONS) {
    const existing = await prisma.question.findFirst({ where: { prompt: q.prompt } });
    if (existing) {
      skipped++;
      console.log(`[seed-questions-expansion-1] já existe, pulando: ${q.prompt.slice(0, 60)}...`);
      continue;
    }

    const concept = await prisma.concept.findUnique({ where: { slug: q.conceptSlug } });
    if (!concept) {
      console.warn(
        `[seed-questions-expansion-1] concept "${q.conceptSlug}" não encontrado — pulando`,
      );
      continue;
    }

    const question = await createQuestion(actor, {
      prompt: q.prompt,
      type: "MULTIPLE_CHOICE",
      difficulty: q.difficulty,
      sourceId: source.id,
      reproductionAllowed: true,
      explanation: q.explanation,
      options: q.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })),
    });

    await linkQuestionToKnowledge(actor, question.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });

    await publishQuestion(actor, question.id);
    created++;
  }

  console.log(
    `\n[seed-questions-expansion-1] concluído: ${created} criada(s), ${skipped} já existiam.`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-questions-expansion-1] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
