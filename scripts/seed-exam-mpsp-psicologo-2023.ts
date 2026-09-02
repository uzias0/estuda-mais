/**
 * Fase "Simulados com provas reais" (Rodada 3) — terceira prova real
 * importada, continuando o pedido do usuário de curadoria de provas
 * reais de Psicologia.
 *
 * Prova escolhida: Analista de Promotoria I - Psicólogo, Ministério
 * Público do Estado de São Paulo (MPSP), Concurso Público nº 01/2022,
 * Edital nº 29/2023, banca FGV, prova aplicada em 12/03/2023.
 *
 * Fonte primária oficial (hospedada pela própria banca FGV):
 *   - Prova (Tipo 1/Branca): https://conhecimento.fgv.br/sites/default/files/concursos/cns005-analista-de-promotoria-i-area-de-saude-e-assistencia-social-psicologocns005-tipo-1.pdf
 *   - Gabarito definitivo (Edital nº 33/2023, pós-recursos, 04/04/2023): https://conhecimento.fgv.br/sites/default/files/concursos/edital-33-analista-de-promotoria-i-gabaritos-definitivos-e-resultados-recursos-para-publicacao-mpsp-.pdf
 *     (este gabarito é CONSOLIDADO — cobre todos os cargos "Analista
 *     de Promotoria I" dessa onda: Assistente Social, Médico Clínico,
 *     Médico Psiquiatra, Médico do Trabalho, Psicólogo; usamos só a
 *     tabela "Analista de Promotoria I - Psicólogo - TIPO 1", Anexo II)
 *
 * A prova completa tem 70 questões: 1-40 são "Módulo I" (Língua
 * Portuguesa, Raciocínio Lógico Matemático, Atualidades, Noções de
 * Direito — fora do escopo de uma plataforma de Psicologia); 41-70 são
 * "Módulo II — Conhecimentos Específicos", TODAS genuinamente de
 * Psicologia (clínica, avaliação psicológica, ética profissional,
 * psicanálise, saúde pública/mental, resolução de conflitos).
 * Importamos só 41-70. Nenhuma questão desse intervalo foi anulada no
 * gabarito oficial (checado programaticamente, não à mão) — a única
 * questão anulada de toda a onda "Analista de Promotoria I" foi a de
 * nº 59 do cargo Médico do Trabalho, fora do escopo desta importação.
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
    number: 41,
    prompt:
      "A psicóloga Flavia trabalha em uma clínica de Reprodução Assistida e faz a avaliação psicológica das pessoas que buscam esse tratamento.\nAvalie se as seguintes afirmativas acerca da realização da avaliação psicológica são falsas (F) ou verdadeiras (V):\nI. Os testes psicológicos são fonte fundamental e obrigatória de informação.\nII. Apenas testes psicológicos aprovados pelo CFP para uso profissional podem ser usados.\nIII. Os testes projetivos substituem as entrevistas psicológicas e de anamnese individual.\nAs afirmativas são, respectivamente,",
    options: ["V, V e F.", "V, F e V.", "F, V e V.", "V, F e F.", "F, V e F."],
    correctLetter: "E",
  },
  {
    number: 42,
    prompt:
      "Fabiana, estudante, 17 anos, procurou a Delegacia para fazer notícia-crime contra seu irmão Bruno, comerciário, 23 anos. Fabiana relatou que Bruno agrediu-a com socos, pontapés e puxões de cabelo após ela se recusar a passar o uniforme dele. Bruno ainda gritou que ele pagava as contas em casa e que aquela era uma obrigação de Fabiana.\nNa situação aqui relatada, considerando o disposto na Lei nº 11.340/2006 (Lei Maria da Penha),",
    options: [
      "a lei não se aplica porque a vítima Fabiana é menor de idade.",
      "a lei não se aplica porque a relação entre a vítima e o agressor não é conjugal.",
      "houve violência patrimonial porque Fabiana sofreu violência dentro de casa.",
      "houve violência física e psicológica por parte de Bruno, baseada no gênero de Fabiana.",
      "não está configurada a violência doméstica porque Bruno tem o dever de educar a irmã.",
    ],
    correctLetter: "D",
  },
  {
    number: 43,
    prompt:
      "Júlia, 8 anos, tem o sono agitado por pesadelos sobre morte, perdeu o interesse pela escola e tem reações de sobressalto a qualquer discussão, isso desde que viu seu pai atacando sua mãe com um facão.\nCom fundamento no DSM V, considerando os critérios para o diagnóstico do transtorno do estresse pós-traumático (TEPT), assinale a afirmativa correta.",
    options: [
      "Testemunhar pessoalmente um evento traumático ocorrido com outras pessoas não satisfaz os critérios para o diagnóstico de TEPT.",
      "O diagnóstico de TEPT é reservado a adolescentes e adultos; em menores de doze anos deve-se falar de transtorno fóbico-ansioso.",
      "A ocorrência de sonhos angustiantes recorrentes com conteúdos ou sentimentos relacionados ao evento traumático é um critério para o diagnóstico do TEPT.",
      "A hipovigilância e a hipertenacidade são critérios diagnósticos que distinguem o TEPT de outros quadros de transtorno de ansiedade.",
      "Pacientes com TEPT buscam reviver as sensações dos eventos traumáticos por meio de flashbacks e de lembranças intrusivas e involuntárias.",
    ],
    correctLetter: "C",
  },
  {
    number: 44,
    prompt:
      "Uma reunião marcada para a escolha do coordenador da equipe técnica foi suspensa sem qualquer decisão após debates acalorados e ânimos exaltados. Parte dos membros da equipe defendia a recondução do atual coordenador, enquanto que outra parte defendia a alternância na função.\nO conflito aqui descrito pode ser classificado como",
    options: [
      "interpessoal latente.",
      "intragrupal manifesto.",
      "intrapessoal percebido.",
      "intergrupal democrático.",
      "interorganizacional sentido.",
    ],
    correctLetter: "B",
  },
  {
    number: 45,
    prompt:
      "A mediação é um instrumento com dinâmica própria, reconhecido como efetivo na reparação de danos e restauração de laços sociais rompidos por força de situações de conflito e outras.\nNa condução do processo de mediação, compete ao mediador",
    options: [
      "persuadir os participantes da mediação quanto às vantagens do acordo.",
      "fornecer o parecer técnico sobre o caso em questão.",
      "apresentar relatório circunstanciado com o teor das conversas.",
      "tomar as decisões consensuais que geram benefícios mútuos.",
      "promover um diálogo equitativo entre as partes envolvidas.",
    ],
    correctLetter: "E",
  },
  {
    number: 46,
    prompt:
      "O Programa Nacional de Controle do Tabagismo oferece estratégias para abordagem e tratamento visando à cessação do vício. No protocolo clínico do programa, o tratamento não medicamentoso, baseado na terapia cognitivo-comportamental, tem o formato de aconselhamento estruturado com abordagem intensiva.\nDe acordo com esse programa, nas sessões de aconselhamento programadas, cabe ao profissional abordar as seguintes discussões, à exceção de uma. Assinale-a.",
    options: [
      "A ambivalência quanto a parar de fumar.",
      "A prioridade da adesão ao tratamento medicamentoso.",
      "As estratégias para superar a crise de abstinência.",
      "O estímulo à prática de exercícios de relaxamento.",
      "A identificação das armadilhas que levam às recaídas.",
    ],
    correctLetter: "B",
  },
  {
    number: 47,
    prompt:
      "A Nota Técnica 11/2019 do Ministério da Saúde, publicada em 04/02, trouxe mudanças na Política de Álcool e outras Drogas e passou a incluir as comunidades terapêuticas e os hospitais psiquiátricos na Rede de Atenção Psicossocial do SUS.\nEssas mudanças foram consideradas por muitos especialistas como um retrocesso em relação à política de saúde mental até então vigente em função",
    options: [
      "do foco no cuidado em rede, com base territorial e respeito à liberdade e singularidade dos usuários.",
      "das práticas de atenção desenvolvidas nos hospitais psiquiátricos, orientadas pela lógica da redução de danos e centralidade nos usuários.",
      "do retorno à lógica manicomial, com a prática de internação prolongada, isolamento e o forte componente religioso que orienta as ações das comunidades terapêuticas.",
      "da elaboração do projeto terapêutico singular, institucional e educacional, incentivando a autonomia e participação das pessoas que se encontram na condição de internos.",
      "do incentivo ao uso das drogas lícitas, que não têm potencial de causar danos, e da abstinência do uso das drogas ilícitas, por seu potencial de causar dependência.",
    ],
    correctLetter: "C",
  },
  {
    number: 48,
    prompt:
      "A comunicação não violenta, metodologia desenvolvida pelo psicólogo Marshall Rosenberg, tem sido reconhecida como um método de resolução pacífica de conflitos em diferentes contextos.\nA comunicação não violenta tem como característica",
    options: [
      "o emprego de palavras positivas ao se fazer a crítica construtiva da responsabilidade do oponente no conflito.",
      "o uso de técnicas de sugestão com a finalidade de se atingir uma solução que atenda a todos os envolvidos.",
      "a escolha de um árbitro imparcial para a escuta empática das razões de cada parte e para a decisão sobre a lide.",
      "o reconhecimento da responsabilidade pessoal pelos próprios sentimentos, necessidades e comportamentos.",
      "a formulação de solicitações em linguagem abstrata e aberta permitindo que o outro faça sua própria interpretação.",
    ],
    correctLetter: "D",
  },
  {
    number: 49,
    prompt:
      "A legislação brasileira busca assegurar e promover o exercício dos direitos e das liberdades fundamentais pela pessoa com deficiência, visando à sua inclusão social e ao exercício pleno da cidadania. Hugo é um rapaz de 28 anos, com paralisia cerebral, graduado em Ciência da Computação.\nSobre a inserção de Hugo no mercado de trabalho, pode-se afirmar que",
    options: [
      "constitui crime negar ou obstar emprego, trabalho ou promoção a Hugo em razão de sua deficiência.",
      "Hugo tem direito a tratamento diferenciado focado no capacitismo e em suas aptidões profissionais.",
      "Hugo tem direito à remuneração compensatória na forma de adicional por insalubridade ou invalidez.",
      "Hugo só poderá se candidatar à vaga em empresa que apresente condições de acessibilidade e inclusão.",
      "será garantido o acesso de Hugo à tecnologia assistiva e à reabilitação física no próprio ambiente de trabalho.",
    ],
    correctLetter: "A",
  },
  {
    number: 50,
    prompt:
      "O Al-Anon é uma organização sem fins lucrativos que oferece suporte para familiares e amigos de pessoas com dependência de álcool. O funcionamento do Al-Anon se baseia em reuniões semanais nas quais os participantes compartilham suas experiências e se apoiam mutuamente. Ao frequentar essas reuniões, Andrea se apercebeu de seu comportamento codependente em relação ao marido Oscar, dependente de álcool há anos.\nSobre essa situação, assinale a afirmativa correta.",
    options: [
      "O termo codependência alcoólica se refere ao uso compartilhado do álcool pelo casal e/ou outros membros da família.",
      "O alcoolismo de Oscar tem causa emocional decorrente das cobranças domésticas e da relação conjugal conflituosa com Andrea.",
      "O objetivo do grupo é ajudar os familiares a lidarem com suas próprias emoções e comportamentos na relação com o usuário de álcool.",
      "O codependente precisa assumir seu papel de cuidador para proteger o dependente das consequências danosas de seu vício.",
      "A dependência de álcool é uma escolha pessoal do alcoolista crônico, portanto, a família deve se abster de apoiar o dependente no tratamento.",
    ],
    correctLetter: "C",
  },
  {
    number: 51,
    prompt:
      "André, casado há dois anos e esperando seu primeiro filho com a esposa, recebeu por e-mail a notícia de sua demissão. André alterna sintomas de ansiedade aguda e de depressão, e finalmente aceitou a oferta de atendimento psicológico.\nA abordagem de intervenção em crise é indicada para André",
    options: [
      "por ser a única opção terapêutica acessível financeiramente para o paciente desempregado.",
      "por permitir o autoconhecimento por meio da análise profunda da personalidade de André.",
      "pelo foco nas estratégias de enfrentamento mais adequadas, naquele momento, na busca de soluções.",
      "como medida preventiva contra futuras demissões e para o aumento da resiliência de André.",
      "para a aceitação por André de sua condição psiquiátrica e para sua adaptação à nova realidade como paciente.",
    ],
    correctLetter: "C",
  },
  {
    number: 52,
    prompt:
      "De acordo com as disposições trazidas pela Lei nº 8.080/1990 (Lei que dispõe sobre as condições para a promoção, proteção e recuperação da saúde, a organização e o funcionamento dos serviços correspondentes e dá outras providências), assinale a afirmativa correta.",
    options: [
      "O dever do Estado de garantir a saúde consiste na formulação e execução de políticas econômicas e sociais e exclui o dever das pessoas, da família, das empresas e da sociedade.",
      "Os níveis de saúde expressam a organização social e econômica do País, tendo a saúde como determinantes e condicionantes, entre outros, a alimentação, a moradia, o saneamento básico, o meio ambiente, o trabalho, a renda, a educação, a atividade física, o transporte, o lazer e o acesso aos bens e serviços essenciais.",
      "Entende-se por vigilância epidemiológica um conjunto de atividades que se destina à promoção e proteção da saúde dos trabalhadores, assim como visa à recuperação e reabilitação da saúde dos trabalhadores submetidos aos riscos e agravos advindos das condições de trabalho.",
      "A assistência à saúde privada é condicionada ao levantamento das demandas de saúde coletiva pela vigilância epidemiológica.",
      "É proibida a participação direta ou indireta de empresas ou de capital estrangeiro na assistência à saúde na hipótese de doações de organismos internacionais vinculados à Organização das Nações Unidas.",
    ],
    correctLetter: "B",
  },
  {
    number: 53,
    prompt:
      "Gustavo é candidato à vaga de merendeiro em uma escola de ensino fundamental e, durante o processo seletivo, participa de dinâmicas de grupos com outros candidatos.\nAs dinâmicas de grupo podem se revelar interessantes para Gustavo porque",
    options: [
      "ele pode aprimorar sua capacidade de se incluir e de trabalhar em grupo.",
      "como existem vários candidatos sendo avaliados, os avaliadores não observarão algum comportamento disruptivo de Gustavo.",
      "a aplicação das dinâmicas favorece os candidatos que são treinados para esse tipo de seleção.",
      "todas as empresas dão feedbacks sobre os desempenhos dos candidatos, favorecendo o aprendizado dos participantes do processo.",
      "nas dinâmicas de grupo até mesmo os candidatos tímidos e introspectivos são beneficiados pelo processo.",
    ],
    correctLetter: "A",
  },
  {
    number: 54,
    prompt:
      "Marília vem apresentando sintomas de bulimia, e decidiu procurar apoio com um terapeuta cognitivo-comportamental.\nUma das técnicas utilizadas pela TCC é",
    options: [
      "a livre associação de palavras.",
      "a interpretação dos sonhos.",
      "a análise dos chistes.",
      "o foco no processo de individuação.",
      "o registro de pensamentos disfuncionais.",
    ],
    correctLetter: "E",
  },
  {
    number: 55,
    prompt:
      "Os instrumentos nos quais se baseia a técnica psicodramática nos atendimentos grupais são",
    options: [
      "aquecimento, dramatização, presentificação, projeção e compartilhamento.",
      "contexto social, contexto grupal e contexto dramático, diretor e ego estendido.",
      "cenário, protagonista, diretor, ego-auxiliar e público.",
      "diretor espontâneo, ego atual e ego futuro.",
      "palco, antagonista, terapeuta, ser relacional e ego projetivo.",
    ],
    correctLetter: "C",
  },
  {
    number: 56,
    prompt:
      "Entre as técnicas extrajudiciais de resolução de conflitos, a negociação se caracteriza por ser",
    options: [
      "um método no qual um terceiro facilitador orienta ativamente a construção da solução de um conflito pelas partes.",
      "uma técnica em que um terceiro neutro e imparcial facilita o diálogo para que os próprios envolvidos construam uma solução para o conflito.",
      "uma forma em que as partes dialogam diretamente sem intervenção de terceiros para encontrar a solução da contenda.",
      "um método em que terceiros escolhidos pelas partes, com conhecimento técnico e jurídico, resolverão a demanda.",
      "uma forma em que um terceiro imparcial e neutro, que presentifica o Estado, decide a contenda.",
    ],
    correctLetter: "C",
  },
  {
    number: 57,
    prompt:
      "Juliana é psicóloga do Ministério Público de São Paulo e, em atendimento a núcleo familiar teve conhecimento de que uma criança estava sendo submetida a maus tratos psicológicos.\nDe acordo com o que preconiza o Código de Ética Profissional do Psicólogo, Juliana",
    options: [
      "não pode dar publicidade a essa dinâmica, pois está impedida em função do dever de sigilo profissional.",
      "não está submetida à necessidade de prestação do sigilo, pois trabalha em instituição de defesa dos interesses sociais e individuais indisponíveis.",
      "pode decidir pela quebra de sigilo, baseando sua decisão na busca do menor prejuízo.",
      "deve abrir mão do sigilo, restringindo-se a prestar as informações que interessem ao processo.",
      "deve abrir mão do sigilo, tornando público tudo que foi relatado durante as entrevistas pela família, ainda que as informações não se relacionem ao processo.",
    ],
    correctLetter: "C",
  },
  {
    number: 58,
    prompt:
      "Avalie se, em caso de interrupção do trabalho, o psicólogo deve\nI. zelar pelo destino dos seus arquivos confidenciais.\nII. repassar todo o material ao psicólogo que vier a substituí-lo caso tenha sido demitido ou exonerado.\nIII. incinerar os arquivos confidenciais, na hipótese de extinção do serviço de Psicologia.\nDe acordo com as disposições do Código de Ética, está correto o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II, apenas.", "I, II e III."],
    correctLetter: "D",
  },
  {
    number: 59,
    prompt:
      "De acordo com a Resolução nº 006/2019, o documento psicológico que é um pronunciamento por escrito, com finalidade de apresentar uma análise técnica, respondendo a uma questão-problema do campo psicológico ou a documentos psicológicos questionados é",
    options: [
      "o parecer psicológico.",
      "a declaração psicológica.",
      "o laudo psicológico.",
      "o atestado psicológico.",
      "o relatório psicológico.",
    ],
    correctLetter: "A",
  },
  {
    number: 60,
    prompt: "Com relação à Gestalt-terapia, assinale a afirmativa correta.",
    options: [
      "É a teoria desenvolvida por Erich Fromm que considera que a principal tarefa do ser humano é se transformar naquilo que realmente ele é.",
      'É a abordagem desenvolvida por Fritz Perls que se concentra mais na experiência "aqui e agora" do cliente.',
      "É o método desenvolvido por Augusto Boal que sistematiza exercícios, jogos e técnicas teatrais que visam a desfiguração física e intelectual de seus participantes.",
      "É a proposta desenvolvida por Viktor Frankl que entende a busca de sentido como a principal força motivadora no ser humano.",
      "É o método terapêutico desenvolvido por Carl Rogers que objetiva facilitar o reconhecimento das emoções e ajudar a definição da própria personalidade.",
    ],
    correctLetter: "B",
  },
  {
    number: 61,
    prompt:
      "Entre as razões para parar de fumar apresentadas pela OMS, o Programa Nacional de Controle do Tabagismo (PNCT) destaca que",
    options: [
      "os não fumantes expostos ao fumo passivo vão desenvolver câncer de pulmão.",
      "os cigarros eletrônicos não expõem os não fumantes à nicotina e outros produtos químicos prejudiciais à saúde.",
      "crianças com menos de 2 anos de idade expostas ao fumo passivo em casa podem contrair infecções auditivas que podem levar a comprometimentos na audição e até à surdez.",
      "fumar vai causar disfunção erétil em algum momento da vida de homens que fumam, pois restringe o fluxo sanguíneo para o pênis, impedindo a ereção.",
      "o tabaco mata mais da metade de seus consumidores.",
    ],
    correctLetter: "C",
  },
  {
    number: 62,
    prompt:
      "Avalie se, de acordo com a Lei Maria da Penha, a política pública que visa coibir a violência doméstica e familiar contra a mulher tem as seguintes diretrizes:\nI. a integração operacional do Poder Judiciário, do Ministério Público e da Defensoria Pública com as áreas de segurança pública, assistência social, saúde, educação, trabalho e habitação;\nII. a implementação de atendimento policial especializado para as mulheres, em particular nas Delegacias de Atendimento à Mulher;\nIII. a celebração de convênios, protocolos, ajustes, termos ou outros instrumentos de promoção de parceria entre órgãos governamentais ou entre estes e entidades não-governamentais, tendo por objetivo a implementação de programas de erradicação da violência doméstica e familiar contra a mulher.\nEstá correto o que se afirma em",
    options: [
      "I, apenas.",
      "I e II, apenas.",
      "I e III, apenas.",
      "II e III, apenas.",
      "I, II e III.",
    ],
    correctLetter: "E",
  },
  {
    number: 63,
    prompt:
      "Com relação ao Código de Ética Profissional do Psicólogo, analise as afirmativas a seguir.\nI. É dever fundamental dos psicólogos prestar serviços profissionais em situações de calamidade pública ou de emergência, sem visar benefício pessoal.\nII. Ao psicólogo é vedado pleitear ou receber comissões, empréstimos, doações ou vantagens outras de qualquer espécie, além dos honorários contratados, assim como intermediar transações financeiras.\nIII. O psicólogo, quando participar de greves ou paralisações, poderá interromper as atividades de emergência desde que avisado previamente à administração superior.\nEstá correto o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II, apenas.", "I, II e III."],
    correctLetter: "D",
  },
  {
    number: 64,
    prompt:
      "Joana é psicóloga do MP-SP e foi designada a realizar a avaliação pericial de um caso que envolve violência e abandono familiar de um casal em relação a cinco crianças.\nEm relação à Resolução CFP 06/2019, é correto afirmar que",
    options: [
      "por se tratar de um procedimento de avaliação psicológica, Joana estará produzindo um relatório psicológico.",
      'caso a avaliação seja feita por uma equipe multiprofissional, não devem ser destacadas no item "análise" do relatório as técnicas privativas da Psicologia e sim na "conclusão".',
      "será feito um laudo psicológico que é composto por quatro itens: Identificação; Descrição da demanda; Análise; Conclusão.",
      "Joana fará um laudo cuja conclusão deve oferecer alguma orientação de encaminhamento/intervenções ou diagnóstico/hipótese diagnóstica ou orientação/sugestão de projeto terapêutico.",
      'será feito um relatório psicológico cujo item "descrição da demanda" deve apresentar os recursos técnico-científicos utilizados e as principais características do trabalho realizado.',
    ],
    correctLetter: "D",
  },
  {
    number: 65,
    prompt:
      "Os impasses da cura analítica são discutidos por Freud no conhecido texto A Análise Finita e Infinita (1937). Nele, Freud aponta que o obstáculo à recusa da feminilidade pelo paciente que se revela por intermédio da inveja fálica na mulher e, no homem, pela aversão contra uma postura passiva ou feminina em relação a outro homem.\nAssim, os esforços terapêuticos esbarram no que Freud denomina como um rochedo",
    options: [
      "da castração.",
      "do narcisismo.",
      "de Eros.",
      "da pulsão de Ego.",
      "do instinto de auto conservação.",
    ],
    correctLetter: "A",
  },
  {
    number: 66,
    prompt:
      "Na condução do tratamento analítico, ocorre por vezes de o sujeito não conseguir se lembrar de um elemento recalcado, passando a agir, assim, sem saber o que está retornando. Freud associa esse fenômeno à transferência, que pode ser algo que ocorre durante uma sessão ou fora dela. Trata-se da reprodução de um roteiro inconsciente que pode se constituir num apelo.\nTal fenômeno denomina-se",
    options: [
      "ação reativa.",
      "inibição neurótica.",
      "acting out.",
      "crise de angústia.",
      "passagem ao ato.",
    ],
    correctLetter: "C",
  },
  {
    number: 67,
    prompt:
      "O diagnóstico diferencial com base nas estruturas clínicas é um método no qual se procura cingir o operador com o qual cada sujeito organiza o campo dos significantes diante da castração. Nesse contexto, Lacan afirma que na psicose há o fracasso da metáfora paterna em significar o desejo da Mãe.\nDessa maneira, o Nome-do-Pai sofre o processo de",
    options: ["foraclusão.", "denegação.", "projeção.", "recalcamento.", "sublimação."],
    correctLetter: "A",
  },
  {
    number: 68,
    prompt:
      "O desenvolvimento psicossexual corresponde à evolução progressiva da sexualidade infantil, a qual passa por diferentes fases de organização do psiquismo. No entanto, há uma etapa em que as atividades sexuais sofrem um decréscimo consecutivo ao recalcamento, dando lugar às identificações secundárias e ao estabelecimento do Supereu. Com a retenção do curso pulsional, aparecem as inibições e as sublimações, necessárias para a inserção do sujeito na cultura.\nEsse período chama-se",
    options: ["oral.", "anal.", "fálico.", "latência.", "genital."],
    correctLetter: "D",
  },
  {
    number: 69,
    prompt:
      "Segundo René Kaës, as alianças possuem caráter inconsciente e enlaçam as formações psíquicas fundamentais: pulsões, fantasias, identificações, etc. Tais alianças inscrevem-se em dois espaços psíquicos: o do sujeito e o da relação com os outros.\nSegundo o autor, uma das principais características das alianças inconscientes é assegurar",
    options: [
      "a utilização do vínculo por meio de um superinvestimento alucinatório.",
      "a produção de uma realidade psíquica compartilhada a partir do ideal de eu.",
      "a funcionalidade patológica e defensiva das alianças inconscientes.",
      "uma ação comum em prol de um objetivo que não poderia ser atingido pelos sujeitos isoladamente.",
      "a constituição da intersubjetividade na qual os sujeitos exploram os seus potenciais arcaicos e compartilham a fantasia originária.",
    ],
    correctLetter: "D",
  },
  {
    number: 70,
    prompt:
      'O autismo vem despertando cada vez mais interesse na comunidade científica em razão do aumento de sua incidência nas últimas décadas. Alguns autores cogitam uma "epidemia" de autismo, enquanto outros justificam o aumento do número de casos como consequência da ampliação dos critérios diagnósticos e da disseminação da informação a seu respeito no mundo.\nAtualmente, a principal mudança diagnóstica sobre o autismo realizada com a publicação da quinta edição do Manual Diagnóstico e Estatístico de Transtornos Mentais (DSM-5) foi',
    options: [
      "a incorporação da noção de autismo enquanto espectro.",
      "a redução do diagnóstico de TDAH como contraponto à ampliação do autismo.",
      'a inclusão no item relacionado às "esquizofrenias de tipo Infantil".',
      'a adoção das terminologias "autismo infantil" e "autismo atípico".',
      "a confirmação por meio de testes e exames dos sinais de autismo antes dos dois anos de idade.",
    ],
    correctLetter: "A",
  },
];

const LETTER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

async function main() {
  const actor = await resolveSeedActor();

  let source = await prisma.source.findFirst({
    where: {
      name: "Concurso Público MPSP — Analista de Promotoria I, Psicólogo (FGV, Edital nº 29/2023)",
    },
  });
  if (!source) {
    source = await createSource(actor, {
      name: "Concurso Público MPSP — Analista de Promotoria I, Psicólogo (FGV, Edital nº 29/2023)",
      sourceType: "OFICIAL",
      classification: "OFICIAL",
      institution: "FGV Conhecimento / Ministério Público do Estado de São Paulo (MPSP)",
      url: "https://conhecimento.fgv.br/concursos/mpsp/1",
      publishedAt: new Date("2023-03-12"),
      accessedAt: new Date(),
      rightsNote:
        "Prova de concurso público (ato administrativo oficial), reproduzida a partir dos PDFs oficiais " +
        "hospedados pela própria banca (FGV Conhecimento): caderno de questões Analista de Promotoria I - " +
        "Psicólogo Tipo 1/Branca " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/cns005-analista-de-promotoria-i-area-de-saude-e-assistencia-social-psicologocns005-tipo-1.pdf) " +
        "e gabarito oficial definitivo pós-recursos (Edital nº 33/2023, 04/04/2023) " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/edital-33-analista-de-promotoria-i-gabaritos-definitivos-e-resultados-recursos-para-publicacao-mpsp-.pdf), " +
        'usando só a tabela "Analista de Promotoria I - Psicólogo - TIPO 1" (Anexo II). Só as 30 questões ' +
        'do bloco "Conhecimentos Específicos" (41-70) foram importadas; nenhuma foi anulada nesse intervalo.',
    });
    console.log(`[seed-exam-mpsp] Source criada: ${source.id}`);
  } else {
    console.log(`[seed-exam-mpsp] Source já existe: ${source.id}`);
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

  let organization = await prisma.organization.findUnique({ where: { slug: "mpsp" } });
  if (!organization) {
    organization = await createOrganization(actor, {
      slug: "mpsp",
      name: "Ministério Público do Estado de São Paulo (MPSP)",
    });
    console.log(`[seed-exam-mpsp] Organization criada: ${organization.id}`);
  }
  if (organization.status !== "PUBLISHED") {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { status: "PUBLISHED" },
    });
  }

  let position = await prisma.position.findUnique({
    where: { slug: "analista-promotoria-i-psicologo-mpsp" },
  });
  if (!position) {
    position = await createPosition(actor, {
      slug: "analista-promotoria-i-psicologo-mpsp",
      name: "Analista de Promotoria I — Psicólogo (MPSP)",
    });
    console.log(`[seed-exam-mpsp] Position criada: ${position.id}`);
  }
  if (position.status !== "PUBLISHED") {
    await prisma.position.update({ where: { id: position.id }, data: { status: "PUBLISHED" } });
  }

  let exam = await prisma.exam.findUnique({
    where: { slug: "concurso-analista-promotoria-i-psicologo-mpsp" },
  });
  if (!exam) {
    exam = await createExam(actor, {
      slug: "concurso-analista-promotoria-i-psicologo-mpsp",
      name: "Concurso Público — Analista de Promotoria I, Psicólogo (MPSP)",
    });
    console.log(`[seed-exam-mpsp] Exam criado: ${exam.id}`);
  }
  if (exam.status !== "PUBLISHED") {
    await publishExam(actor, exam.id);
  }

  const editionName =
    "Edital nº 29/2023 — Prova aplicada em 12/03/2023 (bloco Conhecimentos Específicos)";
  let edition = await prisma.examEdition.findFirst({
    where: { examId: exam.id, name: editionName },
  });
  if (!edition) {
    edition = await createExamEdition(actor, {
      examId: exam.id,
      name: editionName,
      year: 2023,
      examBoardId: examBoard.id,
      organizationId: organization.id,
      positionId: position.id,
      sourceId: source.id,
    });
    console.log(`[seed-exam-mpsp] ExamEdition criada: ${edition.id}`);
  } else {
    console.log(`[seed-exam-mpsp] ExamEdition já existe: ${edition.id}`);
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
      explanation: `Questão ${q.number} da prova oficial (Analista de Promotoria I - Psicólogo, Tipo 1/Branca). Gabarito definitivo FGV: alternativa ${q.correctLetter}.`,
      options: q.options.map((text, i) => ({ text, isCorrect: i === correctIndex, order: i })),
    });
    await publishQuestion(actor, question.id);
    created++;
  }

  console.log(
    `\n[seed-exam-mpsp] concluído: ${created} questão(ões) criada(s), ${skipped} já existiam.`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-exam-mpsp] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
