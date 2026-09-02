/**
 * Fase "Simulados com provas reais" (Rodada 2) — segunda prova real
 * importada, continuando o pedido do usuário de curadoria de provas
 * reais de Psicologia.
 *
 * Prova escolhida: Grupo Psicologia (Psicólogo - Neuropsicologia;
 * Psicólogo - Psicologia Hospitalar; Psicólogo - Psicologia
 * Organizacional e do Trabalho), Concurso Público EBSERH Edital nº
 * 03/2024, banca FGV, prova aplicada em 16/03/2025 — as três
 * especializações fazem a MESMA prova.
 *
 * Fonte primária oficial (hospedada pela própria banca FGV):
 *   - Prova (Tipo 1/Branca): https://conhecimento.fgv.br/sites/default/files/concursos/grupo-12-psicologiae3cnsgp12-tipo-1.pdf
 *   - Gabarito definitivo (consolidado, todos os grupos): https://conhecimento.fgv.br/sites/default/files/concursos/ebserrhassistencial2024_gabarito_definitivo.pdf
 *     (o gabarito cobre TODOS os cargos do concurso EBSERH nessa
 *     onda — Técnico em Análises Clínicas, Enfermagem, Farmácia,
 *     Assistente Social, Biomédico, Odontologia etc. — 23 páginas;
 *     usamos só a tabela "Grupo - Psicologia - TIPO 1", página 21/23)
 *
 * A prova completa tem 60 questões: 1-30 são "Conhecimentos Básicos"
 * (Língua Portuguesa, Legislação EBSERH, Políticas Públicas de Saúde
 * e Educação — fora do escopo de uma plataforma de Psicologia); 31-60
 * são "Conhecimentos Específicos" — TODAS genuinamente de Psicologia
 * (clínica, hospitalar, organizacional, saúde coletiva). Importamos só
 * 31-60. Nenhuma questão desse intervalo foi anulada no gabarito
 * oficial (checado programaticamente, não à mão).
 *
 * Enunciados e alternativas reproduzidos literalmente — mesmo
 * raciocínio de procedência/direitos documentado em
 * `seed-exam-pcsc-psicologo-2024.ts` (provas de concurso público são
 * atos administrativos oficiais).
 *
 * Idempotente: verifica `ExamEdition`/`Question` existentes antes de
 * criar.
 */
import { prisma } from "../src/server/db";
import { createSource } from "../src/modules/curation/server/services/source.service";
import { createExam, publishExam } from "../src/modules/assessment/server/services/exam.service";
import {
  createExamBoard,
  createOrganization,
  createPosition,
} from "../src/modules/assessment/server/services/examReference.service";
import {
  createExamEdition,
  publishExamEdition,
} from "../src/modules/assessment/server/services/examEdition.service";
import {
  createQuestion,
  publishQuestion,
} from "../src/modules/assessment/server/services/question.service";
import { resolveSeedActor } from "./seed-academic-content";

interface ExamQuestion {
  number: number;
  prompt: string;
  options: [string, string, string, string, string];
  correctLetter: "A" | "B" | "C" | "D" | "E";
}

const QUESTIONS: ExamQuestion[] = [
  {
    number: 31,
    prompt:
      "Nise da Silveira foi uma psiquiatra que revolucionou o tratamento da doença mental no Brasil com uma abordagem que valorizava a expressão das emoções, a atividade artística e o contato com animais.\nO trabalho de Nise da Silveira teve como inspiração",
    options: [
      "a Gestalt-terapia de Fritz Perls.",
      "o psicodrama de Jacob Moreno.",
      "a psicologia analítica de Carl Gustav Jung.",
      "a psicanálise humanista de Erich Fromm.",
      "a abordagem centrada na pessoa de Carl Rogers.",
    ],
    correctLetter: "C",
  },
  {
    number: 32,
    prompt:
      "O departamento de gestão de pessoas de uma unidade hospitalar busca selecionar uma funcionária para integrar a equipe do serviço de atendimento ao cliente.\nOs soft skills desejáveis para o exercício dessa função são",
    options: [
      "domínio de um segundo idioma e da linguagem de libras.",
      "inteligência emocional e boa comunicação interpessoal.",
      "concentração e austeridade na busca de soluções pró-hospital.",
      "repertório tecnológico básico e capacidade de trabalho em equipe.",
      "certificado de capacitação em atendimento ao cliente ou curso afim.",
    ],
    correctLetter: "B",
  },
  {
    number: 33,
    prompt:
      "A trajetória do jornalista Maurício Kubrusly é o tema de um documentário em que se retrata momentos de sua rotina a partir do diagnóstico da doença neurológica que o acometeu.\nSobre essa condição é possível apontar que",
    options: [
      "a demência frontotemporal tem como característica principal o surgimento de sintomas psicóticos e/ou depressivos em pacientes que apresentavam um funcionamento normal.",
      "a demência frontotemporal é um transtorno do neurodesenvolvimento degenerativo e incapacitante que acomete preferencialmente pessoas idosas.",
      "transtorno cognitivo frontotemporal ou demência senil é uma das manifestações neurológicas e clínicas da doença de Alzheimer.",
      "mudanças de comportamento e/ou declínio da capacidade linguística são critérios para o diagnóstico do transtorno neurocognitivo frontotemporal.",
      "o transtorno neurocognitivo frontotemporal é tratável e pode até regredir com terapêutica adequada desde que diagnosticado em estágios precoces.",
    ],
    correctLetter: "D",
  },
  {
    number: 34,
    prompt:
      "Débora desenvolveu um quadro de fobia a elevadores desde que ficou presa em um elevador que sofreu uma pane elétrica. Ela passou a contornar esse problema usando as escadas dos prédios, mas acaba de ser transferida para uma seção que funciona no 12º andar.\nDébora buscou a Terapia Cognitivo-Comportamental para lidar com essa limitação e uma das técnicas empregadas por seu terapeuta foi a dessensibilização sistemática.\nA dessensibilização sistemática consiste",
    options: [
      "na imersão da paciente em situações que buscam reconstituir a situação original ansiogênica.",
      "no questionamento socrático dos pensamentos disfuncionais automáticos que desencadeiam a fobia.",
      "no treino mediado pelo terapeuta para o desenvolvimento de habilidades sociais e assertividade na comunicação.",
      "na explicação em linguagem acessível à paciente sobre o funcionamento do psiquismo após a vivência de situações traumáticas.",
      "na exposição gradual e controlada da paciente aos estímulos geradores de ansiedade e uso de técnicas de relaxamento.",
    ],
    correctLetter: "E",
  },
  {
    number: 35,
    prompt:
      "A avaliação de desempenho é uma das fases e ferramentas da gestão de desempenho em uma organização.\nAcerca das modalidades de avaliação de desempenho, avalie as afirmativas a seguir.\nI. A avaliação 360 graus é aquela em que o colaborador recebe feedbacks verticais ascendentes de seu superior hierárquico.\nII. Na avaliação por competências, o colaborador é avaliado com relação às habilidades, conhecimentos e comportamentos necessários para o desempenho de suas funções.\nIII. Na avaliação por objetivos, o gestor e o colaborador avaliam se foram alcançadas as metas claras e mensuráveis previamente acordadas.\nEstá correto o que se afirma em",
    options: [
      "I e II, apenas.",
      "I e III, apenas.",
      "II e III, apenas.",
      "I, II e III.",
      "II, apenas.",
    ],
    correctLetter: "C",
  },
  {
    number: 36,
    prompt:
      "Marcelo é médico intensivista em um grande hospital público e trabalha, sob grande pressão, com pacientes críticos. Em uma ocasião, padecendo de dores de cabeça e estressado, com um longo plantão pela frente, Marcelo se prescreveu um opioide que lhe trouxe imediato alívio e sensação de grande bem-estar. Marcelo passou a fazer uso eventual, mas foi paulatinamente intensificando o uso, a ponto de forjar receitas na tentativa de despistar o controle da farmácia do hospital para obter mais comprimidos da substância.\nSobre a situação que Marcelo atravessa, é correto apontar que",
    options: [
      "a tolerância à substância psicoativa se manifesta pela necessidade de aumentar progressivamente a dosagem usada para alcançar o efeito esperado.",
      "a abstinência se caracteriza pela sensação de superação do vício ao final do longo processo de desintoxicação química.",
      "a intoxicação pela substância psicoativa é uma reação crônica que acontece pelo uso cumulativo da substância estimulante.",
      "Marcelo pode reduzir os danos da ingestão dos opioides combinando seu uso com o de substâncias que agem como antídoto.",
      "as chances de Marcelo desenvolver uma dependência química de opioides são menores pelo fato de ele, como médico, deter um conhecimento técnico quanto aos riscos do uso e do abuso.",
    ],
    correctLetter: "A",
  },
  {
    number: 37,
    prompt:
      "Programas de saúde mental em empresas podem promover o bem-estar emocional dos funcionários, prevenir o estresse e reduzir o impacto de transtornos mentais no ambiente de trabalho.\nAs opções a seguir dão exemplos de programas de saúde mental que podem ser desenvolvidos no ambiente laboral contemplando o bem estar dos colaboradores, à exceção de uma. Assinale-a.",
    options: [
      "Programas de preparação dos funcionários para a aposentadoria.",
      "Workshops de gerenciamento de estresse e desconexão digital.",
      "Oferta de espaços de escuta ativa e acolhimento psicológico confidencial.",
      "Programas de incentivo à 'pejotização' e à autonomia profissional dos colaboradores.",
      "Palestras educativas sobre temas em saúde mental como tabagismo, alcoolismo e depressão.",
    ],
    correctLetter: "D",
  },
  {
    number: 38,
    prompt:
      "A seguinte técnica de entrevista e abordagem de tratamento, idealizada originalmente para pacientes com dependência química, e hoje empregada também em uma série de situações em que favorecer a adesão do paciente ao tratamento é muito importante, como em transtornos alimentares e cessação do tabagismo é",
    options: [
      "o modelo de recompensa.",
      "a entrevista dirigida.",
      "a entrevista psicodinâmica.",
      "a troca de papéis ou role playing.",
      "a entrevista motivacional.",
    ],
    correctLetter: "E",
  },
  {
    number: 39,
    prompt:
      "Bruno, 55 anos, bancário, procurou o pronto-atendimento de uma unidade hospitalar apresentando sintomas de exaustão física e mental, pressão alta, distúrbios gastrointestinais, humor depressivo.\nO médico diagnosticou a Síndrome de Burnout e recomendou um afastamento do trabalho; porém, temendo ser dispensado, Bruno continuou comparecendo ao trabalho e já vê sua produtividade impactada pela dificuldade de concentração.\nIdentifica-se nesse relato uma situação de",
    options: [
      "rotatividade.",
      "presenteísmo.",
      "ergonomia ambiental.",
      "retenção de talentos.",
      "absenteísmo.",
    ],
    correctLetter: "B",
  },
  {
    number: 40,
    prompt:
      "O psicólogo Eduardo integra uma equipe interprofissional na empresa de prestação de serviços na área da saúde em que trabalha.\nSobre o funcionamento de uma equipe com esse perfil é possível afirmar que, na interprofissionalidade,",
    options: [
      "a coordenação da equipe é exercida em rodízio de forma democrática, cabendo ao coordenador a palavra final quanto à definição da estratégia de atuação entre as sugeridas.",
      "existem reuniões de equipe, mas cada profissional atua de forma independente e todos se reportam a um líder hierarquicamente superior na estrutura da empresa.",
      "verifica-se uma diluição entre as competências das diferentes categorias profissionais de forma que seus papéis se tornam indistinguíveis.",
      "profissionais de diferentes formações trabalham de forma horizontal e colaborativa, trocando informações para uma atuação conjunta em benefício do cliente.",
      "as reuniões são agendadas quanto surge uma demanda específica de forma a otimizar o tempo dos colaboradores e focar em resultados.",
    ],
    correctLetter: "D",
  },
  {
    number: 41,
    prompt:
      "Na análise institucional o principal objetivo do analista institucional é desvelar os jogos de sentido que perpassam as relações sociais.\nPara essa teoria, o conceito que aponta não haver polos estáveis entre sujeito e objeto, demarcando que a pesquisa se faz em um espaço do meio, desestabilizando tais polos e respondendo por sua transformação é",
    options: [
      "a análise de implicação.",
      "o mal-estar institucional.",
      "a racionalidade instituída.",
      "o desejo instituinte.",
      "o atravessamento onírico.",
    ],
    correctLetter: "A",
  },
  {
    number: 42,
    prompt:
      "Após desenvolver intervenções para avaliação de um paciente a psicóloga Eliana agendou uma entrevista para falar do que identificou.\nEssa entrevista terá cunho",
    options: ["sistêmico.", "diagnóstico.", "devolutivo.", "anamnésico.", "seletivo."],
    correctLetter: "C",
  },
  {
    number: 43,
    prompt:
      "O documento psicológico resultante de um processo de avaliação psicológica que tem por finalidade subsidiar decisões relacionadas ao contexto em que surgiu a demanda é denominado",
    options: [
      "relatório psicológico.",
      "declaração psicológica.",
      "atestado psicológico.",
      "laudo psicológico.",
      "parecer psicológico.",
    ],
    correctLetter: "D",
  },
  {
    number: 44,
    prompt:
      "Paula Benedita é psicóloga concursada de um pequeno município do interior que foi fortemente castigado por intensas chuvas e enchentes. Psicólogos, médicos e enfermeiros da Prefeitura foram chamados para atuar no atendimento das famílias afetadas.\nDiante da situação hipotética, o profissional",
    options: [
      "deve recusar a convocação pois trabalha com psicologia escolar na Secretaria de Educação da Prefeitura.",
      "deve prestar o serviço profissional nessa situação de calamidade pública.",
      "deve esperar pela convocação do Conselho de Psicologia Regional para atuar na emergência.",
      "precisa se capacitar primeiro para atender dinâmicas que envolvam catástrofes e emergências.",
      "pode atender à convocação desde que o serviço conte horas extras de trabalho.",
    ],
    correctLetter: "B",
  },
  {
    number: 45,
    prompt:
      "Com relação à educação em saúde, avalie as afirmativas a seguir.\nI. É circunscrita à formação de profissionais na área da saúde.\nII. Objetiva produzir melhorias na qualidade de vida do indivíduo e no fortalecimento da população como um todo.\nIII. É um conjunto abrangente de ações que promove conhecimentos, comportamentos e práticas saudáveis.\nEstá correto apenas o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II, apenas.", "II e III, apenas."],
    correctLetter: "E",
  },
  {
    number: 46,
    prompt:
      "O modelo de atenção proposto pelo SUS exige a criação de estratégias que vão além dos cuidados individuais para o atendimento das necessidades de saúde da população.\nNesse sentido, a formação de grupos na Atenção Básica constitui",
    options: [
      "espaço importante no qual as pessoas possam falar sobre a vivência do adoecimento ou condição de vida e das maneiras que encontraram de agir no cotidiano, criando novas formas de superação dos seus problemas.",
      "local de reprodução do modelo hospitalocêntrico, em que a figura do gestor da instituição é apresentada como autoridade do processo de promoção e produção da saúde, ao qual os membros do grupo devem se submeter.",
      "espaço para diagnóstico médico, composto predominantemente por médicos e enfermeiros, dos problemas comuns que afetam a população brasileira, tais como diabetes e hipertensão arterial.",
      "lugar em que são ensinados os conhecimentos corretos para manejo de doenças físicas e psíquicas que afetam à população, com ênfase no manejo acadêmico dos saberes biomédicos e nutricionais.",
      "porta de entrada para demanda espontânea na unidade de saúde, incentivando o aumento de procura por atendimento das pessoas com problemas crônicos e agudos.",
    ],
    correctLetter: "A",
  },
  {
    number: 47,
    prompt:
      "Na gestão da qualidade nas organizações é desenvolvida uma série de atividades visando certificar a conformidade dos produtos e serviços em relação às normas e exigências do público final, investindo-se ainda no constante aperfeiçoamento das práticas.\nEntre os pilares da gestão da qualidade podemos destacar os seguintes, exceto",
    options: [
      "foco no cliente, gestão de relacionamento com fornecedores, apoiadores e público interno e melhoria contínua.",
      "decisões baseadas em fatos, visão sistêmica dos processos e gestão de relacionamento com fornecedores, apoiadores e público interno.",
      "engajamento das pessoas, gerenciamento por processos e melhoria contínua.",
      "gestão de relacionamento com fornecedores, apoiadores e público interno, foco no cliente e liderança motivadora.",
      "liderança motivadora, ambiente reativo à inovação e capacidade aprimorada de antecipar e reagir aos riscos e oportunidades.",
    ],
    correctLetter: "E",
  },
  {
    number: 48,
    prompt:
      "Acerca da terapia familiar sistêmica, avalie as afirmativas a seguir.\nI. Centra-se na família como um todo, não a considerando como uma mera soma das suas partes, pois tudo o que acontece num elemento irá afetar os outros elementos.\nII. A família é um sistema aberto em interação com outros sistemas (escola, emprego, bairro).\nIII. A família é um sistema em constante transformação que se adapta às exigências das diversas fases de seu ciclo de desenvolvimento por meio do equilíbrio dinâmico entre a tendência homeostática e a capacidade de transformação.\nEstá correto o que se afirma em",
    options: [
      "I, apenas.",
      "II e III, apenas.",
      "I e III, apenas.",
      "I e II, apenas.",
      "I, II e III.",
    ],
    correctLetter: "E",
  },
  {
    number: 49,
    prompt:
      "Reginaldo tem 35 anos e sempre apresentou comportamentos impulsivos, extrema dificuldade em regular suas emoções, momentos em que se automutilou e episódios em que desenvolveu crenças delirantes.\nSegundo o DSM 5, os comportamentos de Reginaldo podem ser sugestivos de",
    options: [
      "transtorno de personalidade esquizoide.",
      "depressão maior.",
      "perturbação de personalidade evitante.",
      "transtorno de personalidade borderline.",
      "transtorno obsessivo compulsivo.",
    ],
    correctLetter: "D",
  },
  {
    number: 50,
    prompt:
      "A aprendizagem nas empresas é um processo dinâmico e contínuo de aquisição, compartilhamento e aplicação de conhecimentos que visam à melhoria de seus desempenhos e à adaptação às transformações que as cercam.\nJúlio trabalha há 5 anos na área de marketing da empresa Preparando Alimentos e participou de uma capacitação programada com a equipe da cozinha para desenvolver um projeto de inovação das receitas da empresa.\nO relato fala de",
    options: [
      "aprendizagem solitária.",
      "aprendizagem solidária.",
      "aprendizagem interdepartamental.",
      "capacitação ecológica.",
      "treinamento sustentável.",
    ],
    correctLetter: "C",
  },
  {
    number: 51,
    prompt:
      "Frantz Fanon é um nome central nos estudos culturais, pós-coloniais e africano-americanos, conhecido por sua vigorosa crítica ao racismo. A obra do psiquiatra e filósofo político martinicano é de grande importância por desvelar os efeitos traumáticos da dominação colonial na subjetividade, inscrevendo-se como referência fundamental para o estudo do psiquismo e das determinações sociais.\nDe acordo com a sua teoria,",
    options: [
      "o combate às epistemologias colonialistas se faz por meio da abstração de conceitos universais.",
      "a psicologia deve se espelhar no modelo das ciências naturais para lançar luz sobre o ser negro.",
      "apesar de a teoria ser distinta da práxis política, é importante aplicar o conhecimento científico sobre as relações sociais.",
      "o discurso essencialista característico do colonialismo impede o negro de se constituir enquanto sujeito nas relações sociais.",
      "o racismo será derrotado quando forem criadas oportunidades idênticas de acesso de brancos e negros aos postos de trabalho.",
    ],
    correctLetter: "D",
  },
  {
    number: 52,
    prompt:
      "Tanto a entrevista clínica quanto a forense são procedimentos técnico-científicos que têm em comum estratégias para evocar narrativas que buscam sustentar as conclusões da avaliação com base em evidências.\nA respeito dessas duas modalidades de entrevistas, é correto afirmar que",
    options: [
      "o entrevistador clínico deve adotar uma postura neutra para obter evidências sobre os fatos que figuram como possíveis violações de direitos.",
      "o uso de testes projetivos tem como pré-requisito a narração exata de como a pessoa pensa e se comporta para revelar aspectos de sua personalidade.",
      "nas entrevistas semiestruturadas, todas as perguntas aos entrevistados são lidas palavra por palavra e na ordem previamente determinada.",
      "a entrevista forense tem como objetivo promover as narrativas subjetivas dos entrevistados em prol do desenvolvimento emocional do indivíduo.",
      "o risco de simulação ou dissimulação tende a aumentar nos casos de entrevistados que estão em um contexto forense.",
    ],
    correctLetter: "E",
  },
  {
    number: 53,
    prompt:
      'Juliana é psicóloga e atua num contexto multiprofissional. Ela produzirá um relatório em conjunto com profissionais de outras áreas, preservando-se a autonomia e a ética profissional dos envolvidos.\nCom relação ao relatório multiprofissional, analise as afirmativas a seguir.\nI. No item "Procedimento", a descrição dos procedimentos e/ou técnicas privativas da Psicologia deve vir separada das descritas pelas(os) demais profissionais.\nII. No item "Análise", orienta-se que cada profissional faça sua análise separadamente, identificando, com subtítulo, o nome e a categoria profissional.\nIII. A conclusão do relatório multiprofissional deve ser feita em separado, mesmo quando se trate de um processo de trabalho interdisciplinar.\nEstá correto o que se afirma em',
    options: ["I, apenas.", "III, apenas.", "I e II, apenas.", "II e III, apenas.", "I, II e III."],
    correctLetter: "C",
  },
  {
    number: 54,
    prompt:
      "Designada como regra técnica fundamental por S. Freud, trata-se do método clínico de investigação do inconsciente segundo o qual o paciente deve exprimir, durante o tratamento, tudo o que lhe vem à mente, sem nenhuma discriminação.\nTal método chama-se",
    options: ["catarse.", "hipnose.", "sugestão.", "associação livre.", "atenção flutuante."],
    correctLetter: "D",
  },
  {
    number: 55,
    prompt:
      'Os estudos de caso são bastante empregados como ferramenta metodológica na pesquisa em psicologia, de modo que atualmente podem ser apontados como uma das estratégias mais frequentes.\nCom relação ao estudo de caso, analise as afirmativas a seguir.\nI. O estudo de caso tem como pressuposto metodológico o princípio de que o conhecimento é algo em constante (re)construção.\nII. Os "estudos de caso exploratórios" têm como meta a descoberta de novas áreas de pesquisa ou o delineamento de novas abordagens para objetos pouco conhecidos.\nIII. Os "estudos de caso observacionais" utilizam a observação como técnica de coleta de dados principal e permitem ao pesquisador um contato próximo com o ambiente no qual seu objeto encontra-se inserido.\nEstá correto o que se afirma em',
    options: ["I, apenas.", "III, apenas.", "I e II, apenas.", "II e III, apenas.", "I, II e III."],
    correctLetter: "E",
  },
  {
    number: 56,
    prompt:
      "Spink (2003) destaca que o trabalho do(a) psicólogo(a) junto aos cenários da saúde, suas respectivas populações e instituições implica diversos desafios éticos.\nTendo em vista tais contextos, um dos objetivos da atuação do psicólogo(a) é",
    options: [
      "construir estimativas de risco de doenças mentais crônicas para delinear estratégias educativas.",
      "possibilitar que os usuários de um determinado território se transformem em sujeito de psicoterapia.",
      "compreender os significados que o processo saúde-doença tem para o sujeito e para os grupos sociais.",
      "permitir que o saber popular seja totalizado pelos saberes oficiais, enfatizando o discurso científico.",
      "contribuir para a normalização de sujeitos e coletivos por meio da promoção do bem-estar biopsicossocial.",
    ],
    correctLetter: "C",
  },
  {
    number: 57,
    prompt:
      "Na perspectiva da análise institucional, os processos de autoanálise e autogestão tem uma potência crítica e transformadora das instituições.\nAssinale a afirmativa correta acerca da autoanálise.",
    options: [
      "Considera que a comunidade precisa se organizar em coletivos para produzir o seu saber.",
      "É um passo que precede a autogestão, sendo parte de um processo linear e não iterativo.",
      "Pressupõe que o saber dos especialistas é alienado e não passível de articulações horizontais.",
      "Prescinde da participação dos sujeitos que a comunidade considera especialistas em determinadas áreas.",
      "Atinge a sua completude ao possibilitar que o instituinte se torne instituído, transformando as relações.",
    ],
    correctLetter: "A",
  },
  {
    number: 58,
    prompt:
      "Os saberes médicos ocupam uma posição hegemônica no campo de drogas contemporâneo, influenciando políticas públicas e ofertas assistenciais e preventivas da dependência de substâncias psicoativas.\nCom relação à influência dos saberes médicos nessa área, é correto afirmar, de uma forma crítica, que",
    options: [
      "fundamentam uma perspectiva questionadora quanto à normatização dos comportamentos dos usuários.",
      "são amparados no conhecimento do sistema neurológico e da genética e defendem a autonomia dos usuários.",
      "compõem a articulação de três formações discursivas, sendo elas a medicalização, a criminalização e a moralização dos usuários.",
      "compreendem a dependência de drogas como um problema de personalidade, sendo consenso a defesa da redução de danos.",
      "consideram que o uso compulsivo de drogas tem a função de redefinir a representação do corpo na dinâmica psíquica, valorizando as psicoterapias.",
    ],
    correctLetter: "C",
  },
  {
    number: 59,
    prompt:
      "Para a Organização Mundial da Saúde, a saúde mental pode ser considerada um estado de bem-estar vivido pelo indivíduo, que possibilita o desenvolvimento de suas habilidades pessoais para responder aos desafios da vida e contribuir com a comunidade.\nAnalisando o conceito de saúde mental da OMS a partir de uma perspectiva crítica, um dos fatores fundamentais para o trabalho da psicologia nos contextos de saúde é",
    options: [
      "compreender a saúde mental a partir de aspectos de personalidade e temperamento.",
      "associar a saúde mental com a manutenção de equilíbrio emocional e resiliência individuais.",
      "identificar a saúde mental como ausência de sofrimento psíquico e de diagnósticos psiquiátricos.",
      "correlacionar saúde mental e produtividade, expressa pela capacidade de se inserir e se manter em atividade laboral.",
      "considerar que a saúde mental não se reduz a um atributo individual, mas sim inserida nas condições socioculturais de um contexto.",
    ],
    correctLetter: "E",
  },
  {
    number: 60,
    prompt:
      'Na conferência intitulada "Crise da medicina ou crise da antimedicina", realizada no Brasil por Michel Foucault em 1974, o autor enfatizou que a perspectiva do direito à saúde surgiu num contexto em que a noção de Estado à serviço do indivíduo em boa saúde foi substituída pela noção de indivíduo em boa saúde à serviço do Estado.\nConsiderando a visão crítica do autor, um aspecto da atuação da psicologia na saúde coletiva é',
    options: [
      "questionar o uso da psicologia para instrumentalizar o controle do individual e do coletivo.",
      "articular a psicologia a outros saberes da saúde para fomentar a distinção entre o normal e o anormal.",
      "contribuir para o cuidado do corpo, entendendo que o acesso a direitos é indissociável do cumprimento de deveres.",
      "denunciar a cientificidade e a eficácia da medicina moderna, uma vez que a psicologia converteu-se em antimedicina.",
      "fundamentar o papel das ciências humanas e sociais para normalizar o cuidado no campo da saúde.",
    ],
    correctLetter: "A",
  },
];

const LETTER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

async function main() {
  const actor = await resolveSeedActor();

  let source = await prisma.source.findFirst({
    where: { name: "Concurso Público EBSERH — Grupo Psicologia (FGV, Edital nº 03/2024)" },
  });
  if (!source) {
    source = await createSource(actor, {
      name: "Concurso Público EBSERH — Grupo Psicologia (FGV, Edital nº 03/2024)",
      sourceType: "OFICIAL",
      classification: "OFICIAL",
      institution: "FGV Conhecimento / Empresa Brasileira de Serviços Hospitalares (EBSERH)",
      url: "https://conhecimento.fgv.br/concursos/ebserh24/3",
      publishedAt: new Date("2025-03-16"),
      accessedAt: new Date(),
      rightsNote:
        "Prova de concurso público (ato administrativo oficial), reproduzida a partir dos PDFs oficiais " +
        "hospedados pela própria banca (FGV Conhecimento): caderno de questões Grupo Psicologia Tipo 1/Branca " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/grupo-12-psicologiae3cnsgp12-tipo-1.pdf) " +
        "e gabarito oficial definitivo consolidado (todos os cargos do concurso EBSERH Edital 03/2024) " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/ebserrhassistencial2024_gabarito_definitivo.pdf), " +
        'usando só a tabela "Grupo - Psicologia - TIPO 1" (página 21/23). Só as 30 questões do bloco ' +
        '"Conhecimentos Específicos" (31-60) foram importadas; nenhuma foi anulada nesse intervalo.',
    });
    console.log(`[seed-exam-ebserh] Source criada: ${source.id}`);
  } else {
    console.log(`[seed-exam-ebserh] Source já existe: ${source.id}`);
  }
  if (source.status !== "PUBLISHED") {
    source = await prisma.source.update({
      where: { id: source.id },
      data: { status: "PUBLISHED" },
    });
  }

  let examBoard = await prisma.examBoard.findUnique({ where: { slug: "fgv" } });
  if (!examBoard) {
    examBoard = await createExamBoard(actor, {
      slug: "fgv",
      name: "FGV (Fundação Getulio Vargas)",
    });
  }
  if (examBoard.status !== "PUBLISHED") {
    await prisma.examBoard.update({ where: { id: examBoard.id }, data: { status: "PUBLISHED" } });
  }

  let organization = await prisma.organization.findUnique({ where: { slug: "ebserh" } });
  if (!organization) {
    organization = await createOrganization(actor, {
      slug: "ebserh",
      name: "Empresa Brasileira de Serviços Hospitalares (EBSERH)",
    });
    console.log(`[seed-exam-ebserh] Organization criada: ${organization.id}`);
  }
  if (organization.status !== "PUBLISHED") {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { status: "PUBLISHED" },
    });
  }

  let position = await prisma.position.findUnique({
    where: { slug: "psicologo-ebserh-grupo-psicologia" },
  });
  if (!position) {
    position = await createPosition(actor, {
      slug: "psicologo-ebserh-grupo-psicologia",
      name: "Psicólogo — Neuropsicologia / Psicologia Hospitalar / Psicologia Organizacional (EBSERH)",
    });
    console.log(`[seed-exam-ebserh] Position criada: ${position.id}`);
  }
  if (position.status !== "PUBLISHED") {
    await prisma.position.update({ where: { id: position.id }, data: { status: "PUBLISHED" } });
  }

  let exam = await prisma.exam.findUnique({ where: { slug: "concurso-psicologo-ebserh" } });
  if (!exam) {
    exam = await createExam(actor, {
      slug: "concurso-psicologo-ebserh",
      name: "Concurso Público — Psicólogo (EBSERH)",
    });
    console.log(`[seed-exam-ebserh] Exam criado: ${exam.id}`);
  }
  if (exam.status !== "PUBLISHED") {
    await publishExam(actor, exam.id);
  }

  const editionName =
    "Edital nº 03/2024 — Prova aplicada em 16/03/2025 (bloco Conhecimentos Específicos)";
  let edition = await prisma.examEdition.findFirst({
    where: { examId: exam.id, name: editionName },
  });
  if (!edition) {
    edition = await createExamEdition(actor, {
      examId: exam.id,
      name: editionName,
      year: 2025,
      examBoardId: examBoard.id,
      organizationId: organization.id,
      positionId: position.id,
      sourceId: source.id,
    });
    console.log(`[seed-exam-ebserh] ExamEdition criada: ${edition.id}`);
  } else {
    console.log(`[seed-exam-ebserh] ExamEdition já existe: ${edition.id}`);
  }
  if (edition.status !== "PUBLISHED") {
    await publishExamEdition(actor, edition.id);
  }

  let created = 0;
  let skipped = 0;
  for (const q of QUESTIONS) {
    const existing = await prisma.question.findFirst({ where: { prompt: q.prompt } });
    if (existing) {
      skipped++;
      continue;
    }

    const correctIndex = LETTER_INDEX[q.correctLetter];
    const question = await createQuestion(actor, {
      prompt: q.prompt,
      type: "MULTIPLE_CHOICE",
      difficulty: "AVANCADO",
      examEditionId: edition.id,
      sourceId: source.id,
      reproductionAllowed: true,
      explanation: `Questão ${q.number} da prova oficial (Grupo Psicologia, Tipo 1/Branca). Gabarito definitivo FGV: alternativa ${q.correctLetter}.`,
      options: q.options.map((text, i) => ({ text, isCorrect: i === correctIndex, order: i })),
    });
    await publishQuestion(actor, question.id);
    created++;
  }

  console.log(
    `\n[seed-exam-ebserh] concluído: ${created} questão(ões) criada(s), ${skipped} já existiam.`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-exam-ebserh] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
