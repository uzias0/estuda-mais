/**
 * Fase "Simulados com provas reais" (Rodada 1) — primeira prova real
 * importada, atendendo ao pedido explícito do usuário: "faça uma
 * curadoria completa de todas as provas importantes, todos simulados
 * recentes... com as respostas de tudo", com links reais fornecidos
 * (pciconcursos.com.br, CFP, Gran Cursos, gov.br/mulheres).
 *
 * Prova escolhida: Psicólogo Policial Civil, Polícia Civil de Santa
 * Catarina, Concurso Público Edital nº 2/2023, banca FGV, aplicada em
 * 28/01/2024 — encontrada a partir de busca por "psicólogo delegacia da
 * mulher" (exemplo citado pelo usuário); é um cargo de psicólogo em
 * carreira policial civil, cargo real que pode incluir atuação em
 * Delegacias Especializadas de Atendimento à Mulher (DEAMs).
 *
 * Fonte primária oficial (hospedada pela própria banca FGV, não um
 * agregador terceiro):
 *   - Prova (Tipo 1/Branca): https://conhecimento.fgv.br/sites/default/files/concursos/psicologo-policial-civil-objetivacns001-tipo-1.pdf
 *   - Gabarito definitivo (26/02/2024, pós-recursos): https://conhecimento.fgv.br/sites/default/files/concursos/pcscpsicologo2024_gabarito_definitivo_20240220.pdf
 *   - Edital: https://conhecimento.fgv.br/sites/default/files/concursos/edital-de-abertura-pcsc_psicologo_doe-retificado_28.10.2024.pdf
 *
 * Importa SÓ as 40 questões do bloco "Psicologia" (61-100) — as únicas
 * relevantes para uma plataforma de estudos de Psicologia; os blocos de
 * Língua Portuguesa/Raciocínio Lógico/Direito/Direitos Humanos (1-60)
 * ficam de fora. A questão 95 foi ANULADA pelo gabarito oficial
 * ("Questão Anulada") — sem resposta oficial correta, por isso é
 * excluída (não faz sentido pontuar/gabaritar algo que a própria banca
 * invalidou).
 *
 * Enunciados e alternativas são reproduzidos LITERALMENTE (mesmo texto
 * do caderno oficial Tipo 1/Branca) — prática padrão da indústria de
 * preparação para concursos no Brasil (é exatamente o que
 * pciconcursos.com.br, QConcursos, Gran Cursos etc. fazem: reproduzir
 * questões de provas públicas na íntegra com gabarito oficial). Provas
 * de concurso público são atos administrativos oficiais, não obras
 * autorais sujeitas a direitos de reprodução no mesmo sentido de uma
 * obra literária — `reproductionAllowed: true`. `Source.rightsNote`
 * documenta essa base e os links oficiais para auditoria futura.
 *
 * Idempotente: verifica se a ExamEdition já existe (por nome) antes de
 * criar; verifica se cada questão já existe (por prompt) antes de criar.
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
  options: [string, string, string, string, string]; // A, B, C, D, E
  correctLetter: "A" | "B" | "C" | "D" | "E";
}

// Enunciados e alternativas literais do caderno oficial (Tipo 1 — Branca).
// Gabarito: definitivo pós-recursos (26/02/2024), posições 61-100, Tipo 1.
const QUESTIONS: ExamQuestion[] = [
  {
    number: 61,
    prompt:
      "O Brasil registra situações graves, que atingem sua população, tais como inundações, deslizamentos de terra, rompimentos de barragens, grandes acidentes. Cada vez mais é reconhecida a relevância da atuação de profissionais da Psicologia em contextos de riscos, emergências e desastres.\nAssinale a opção que melhor descreve a importância da contribuição da Psicologia nessas situações.",
    options: [
      "As vítimas de desastres desenvolvem o Transtorno de Estresse Pós-Traumático e necessitam de intervenção individual psicoterápica e medicamentosa.",
      "As populações já vulneráveis ou vulnerabilizadas pela situação de emergência e desastres precisam de assistencialismo para se recuperar de suas perdas humanas e materiais.",
      "A Psicologia vai compor a rede de cuidados em intervenções que vão desde a prevenção até a recuperação no pós-desastre, atuando conjuntamente com diferentes setores.",
      "O luto caracteriza-se enquanto uma reação psicopatológica frente ao fenômeno de perda de referências afetivas significativas decorrente da situação de desastre.",
      "As intervenções psicoterápicas breves e de psicoeducação permitem explorar o modo como a pessoa experimentou as crises e os eventos pregressos de sua vida infantil.",
    ],
    correctLetter: "C",
  },
  {
    number: 62,
    prompt:
      "Francisco, 80 anos, tem sequelas motoras e neurológicas de um AVC hemorrágico e é hoje um paciente acamado. Seu filho, Pedro, contraiu um empréstimo consignado na conta de aposentadoria do idoso e, com o recurso, adquiriu uma motocicleta e outros bens de consumo pessoal como relógios e roupas de marca.\nIdentifica-se aqui uma situação de",
    options: [
      "antecipação de herança.",
      "violência financeira.",
      "negligência patrimonial.",
      "abuso psicológico.",
      "interdição por incapacidade civil.",
    ],
    correctLetter: "B",
  },
  {
    number: 63,
    prompt:
      "A autópsia psicológica nasceu como um procedimento para assessorar médicos forenses no curso de investigações de morte, especialmente em casos duvidosos. Atualmente, diversas publicações científicas discutem o uso da autópsia psicológica ou psicossocial como abordagem metodológica para a compreensão do fenômeno do suicídio.\nCom relação a essa abordagem, avalie as afirmativas a seguir.\nI. A autópsia psicológica contribui para a identificação de fatores de risco e correlatos sociodemográficos do suicídio, concorrendo para estruturar ações de prevenção e atendimento.\nII. São evitadas entrevistas com informantes da família a fim de prevenir novos suicídios provocados pelo sentimento de culpa.\nIII. A autópsia psicológica é importante na dosimetria da pena do criminoso por considerar fatores como a intencionalidade, a premeditação e o potencial de reincidência no crime.\nEstá correto o que se afirma em",
    options: [
      "I e II, apenas.",
      "I e III, apenas.",
      "II e III, apenas.",
      "I, II e III.",
      "I, apenas.",
    ],
    correctLetter: "B",
  },
  {
    number: 64,
    prompt:
      "Sérgio é psicólogo organizacional e está organizando um processo de seleção e recrutamento de novos colaboradores. Sérgio quer fazer uma avaliação psicológica dos candidatos para uma seleção mais adequada às vagas disponíveis e, entre outros recursos, ele faz uso de testes psicológicos.\nPara seu trabalho de seleção, Sérgio deve",
    options: [
      "escolher, em busca ao SATEPSI do CFP, os testes favoráveis para os construtos que ele quer avaliar.",
      "aplicar testes de personalidade como o Teste de Apercepção Infantil e o Rorschach Clínico.",
      "aplicar provas de conhecimentos específicos necessários para a execução das tarefas relacionadas aos cargos.",
      "consultar o administrador de Recursos Humanos sobre os testes psicológicos a serem empregados na Avaliação Psicológica.",
      "adaptar a aplicação dos testes psicológicos de forma a garantir suas qualidades técnicas e psicométricas.",
    ],
    correctLetter: "A",
  },
  {
    number: 65,
    prompt:
      "Lucas, 19 anos, invadiu a propriedade de seu vizinho idoso, Sr. José, para furtar uma bicicleta. Alertado pelos latidos do cão, o idoso saiu de casa e surpreendeu Lucas saindo com a bicicleta.\nPara fugir do local, Lucas atingiu o Sr. José que, na queda, teve os óculos quebrados e ferimentos no braço.\nUma prática de Justiça Restaurativa nessa hipótese buscará",
    options: [
      "qualificar como etarismo a ação de Lucas.",
      "a admissão de culpa, por parte de Lucas, no processo judicial.",
      "a reparação dos danos sofridos pelo idoso.",
      "a participação compulsória do acusado pelo delito.",
      "a absolvição sumária do jovem infrator.",
    ],
    correctLetter: "C",
  },
  {
    number: 66,
    prompt:
      "A gestão por competências é uma abordagem que coloca as pessoas no centro da estratégia de gestão de recursos humanos, reconhecendo que suas competências são um ativo valioso para a organização. Além das competências técnicas, as competências comportamentais são importantes porque contribuem para o bom funcionamento de uma organização, para o bem-estar dos colaboradores e para o sucesso profissional.\nSão exemplos de competências comportamentais:",
    options: [
      "domínio de um segundo idioma e autogestão.",
      "comunicação e conhecimento da legislação.",
      "manejo de sistemas de informação e empatia.",
      "pensamento crítico e liderança.",
      "trabalho em equipe e subordinação.",
    ],
    correctLetter: "D",
  },
  {
    number: 67,
    prompt:
      "A legislação que trata da proteção de crianças e adolescentes vítimas ou testemunhas de violência sexual traz uma preocupação com sua revitimização. Em casos de violência sexual, o seguinte cuidado pode ser tomado para evitar a revitimização:",
    options: [
      "tomar pelo menos dois depoimentos especiais a fim de garantir a fidedignidade da prova.",
      "lavrar registro policial com a descrição dos fatos na presença da criança ou adolescente.",
      "realizar a perícia física para a coleta de vestígios em todos os casos para descarte da ocorrência de fatos.",
      "na inquirição das vítimas, criar estratégias para romper o silêncio, respeitado seu estágio de desenvolvimento.",
      "coletar informação com o familiar ou acompanhante da criança ou do adolescente vítimas.",
    ],
    correctLetter: "E",
  },
  {
    number: 68,
    prompt:
      "De acordo com a Instrução Normativa nº 78/2014 da Polícia Federal, é necessário garantir a aptidão psicológica dos interessados no manuseio de armas de fogo, comprovada por meio da submissão a uma bateria de instrumentos de avaliação.\nSão indicadores psicológicos restritivos para que o interessado seja considerado apto:",
    options: [
      "explosividade e adaptação.",
      "influenciabilidade e imprevisibilidade.",
      "prudência e vulnerabilidade.",
      "controle e imaturidade.",
      "equilíbrio e oposição.",
    ],
    correctLetter: "B",
  },
  {
    number: 69,
    prompt:
      "Fábio foi apreendido quando praticava ato infracional análogo ao Tráfico de Drogas. Na audiência, o adolescente relatou que era dependente de cocaína, que traficava para manter seu vício e que aceitava fazer um tratamento. O Juiz aplicou a medida de semiliberdade para o adolescente.\nNessa situação, a medida socioeducativa aplicada a Fábio deve ser cumprida",
    options: [
      "em unidade que ofereça o programa de privação de liberdade mais próxima de sua residência.",
      "no CAPSi para a realização do tratamento da dependência química.",
      "no Centro de Referência Especializado de Assistência Social (CREAS) de seu bairro.",
      "na Vara de Infância e Juventude com competência infracional.",
      "em presídio comum, em carceragem separada da dos presos adultos.",
    ],
    correctLetter: "A",
  },
  {
    number: 70,
    prompt:
      "Existem aspectos da organização do trabalho que merecem atenção do psicólogo pois podem gerar efeitos deletérios sobre a saúde mental dos trabalhadores e repercutir na qualidade da vida familiar e social do trabalhador.\nAssinale a opção que apresenta apenas fatores de promoção da saúde do trabalhador.",
    options: [
      "Pressão por resultados e ergonomia cognitiva.",
      "Respeito aos direitos no trabalho e estímulo à capacitação dos trabalhadores.",
      "Incremento do absenteísmo e programas de gestão de segurança e saúde.",
      "Práticas de assédio moral e excesso de horas-extras.",
      "Sobrecarga de trabalho e horários irregulares.",
    ],
    correctLetter: "B",
  },
  {
    number: 71,
    prompt:
      "Baseado em boas práticas em entrevistas e em inúmeros estudos empíricos, o protocolo NICHD é uma técnica muito usada ao redor do mundo na avaliação de casos de suspeita de abuso sexual infantil.\nFaz parte das estratégias desse protocolo",
    options: [
      "a aplicação prévia de testes psicológicos para avaliação da memória e da linguagem para adequação do instrumento ao desenvolvimento cognitivo da criança.",
      "a criação de um ambiente descontraído e de apoio na fase substantiva da entrevista para estabelecer o rapport entre a criança e o entrevistador.",
      "a utilização de questões abertas como a principal estratégia de estimulação da evocação livre por parte da criança de acontecimentos da sua vida.",
      "a opção prioritária por questões de múltipla escolha ou questões sugestivas para facilitar a evocação dos fatos pela criança e evitar distrações.",
      "o cuidado em utilizar palavras diferentes das usadas pela criança e de evitar referência aos detalhes mencionados por ela para não contaminar as memórias referentes ao evento.",
    ],
    correctLetter: "C",
  },
  {
    number: 72,
    prompt:
      "A violação aos direitos de crianças e adolescentes pode se manifestar de diferentes formas, sendo uma delas a negligência no atendimento às suas necessidades. É exemplo de negligência:",
    options: [
      "implantar falsas memórias referentes a abusos sexuais.",
      "promover alienação parental comprometendo o vínculo com o outro genitor.",
      "usar a criança ou o adolescente em atividade sexual em troca de remuneração.",
      "deixar de prover alimentação nutritiva e variada por falta de recursos materiais.",
      "deixar a criança sozinha e sem cuidados por longos períodos.",
    ],
    correctLetter: "E",
  },
  {
    number: 73,
    prompt:
      "Opiáceos são classificados como substâncias oriundas do ópio e opioides são produtos sintéticos fabricados em laboratório com ação semelhante à dos opiáceos.\nSobre esse grupo de substâncias psicoativas é correto afirmar que",
    options: [
      "opioides e opiáceos são usados para aliviar a dor, mas também provocam uma sensação de grande bem-estar e podem levar à dependência.",
      "derivados do ópio como morfina e fentanil constituem um grande problema de saúde e de segurança pública já que são drogas ilícitas.",
      "o desenvolvimento da tolerância pode ocorrer depois de um período do uso contínuo de opiáceos e opioides e os usuários passam a consumir doses menores.",
      "a dependência de opioides e opiáceos acontece porque essas substâncias exercem uma ação perturbadora na atividade do sistema nervoso central.",
      "o uso recreativo de cocaína faz parte da estratégia de redução de danos nos casos de dependência de heroína.",
    ],
    correctLetter: "A",
  },
  {
    number: 74,
    prompt:
      "Danielle, 13 anos, fugiu de casa e foi encontrada por seus pais dias após, em companhia de André, um homem de 30 anos que ela havia conhecido pela Internet. Danielle resistiu em voltar para casa e afirmou que André era o homem de sua vida, com quem ela teria um filho.\nDe acordo com a legislação, trata-se aqui de caso de",
    options: [
      "relação consensual entre a adolescente e o namorado.",
      "estupro de vulnerável.",
      "exploração sexual mediante fraude.",
      "crime de importunação sexual.",
      "violência moral.",
    ],
    correctLetter: "B",
  },
  {
    number: 75,
    prompt:
      "Vera completou cinco anos como advogada em uma firma, mas sua carreira está estagnada porque ela não consegue falar em público. Vera teme tropeçar nas palavras, ruborizar, transpirar excessivamente, e vem se esquivando de participar de reuniões com clientes e de comparecer a eventos representando a firma, temendo ser alvo de avaliações negativas.\nO quadro apresentado por Vera sugere o diagnóstico de",
    options: [
      "agorafobia.",
      "transtorno de estresse pós traumático.",
      "síndrome de Burnout.",
      "fobia social.",
      "transtorno depressivo persistente.",
    ],
    correctLetter: "D",
  },
  {
    number: 76,
    prompt:
      "As primeiras pesquisas relacionadas à produção de falsas memórias começaram a ser desenvolvidas no final do século XIX, embora tenham se desdobrado na última década do século XX. Alguns trabalhos indicam que é possível criar erros de memória com recurso a perguntas sugestivas, alertando sobre a cautela durante os procedimentos interrogatórios, notadamente nos contextos policial e forense.\nAssinale a afirmativa correta com relação ao fenômeno mnêmico.",
    options: [
      "A recordação é um processo reconstrutivo, guiado por esquemas mentais que funcionam como organizadores gerais preexistentes.",
      "A memória funciona de forma similar a um sistema de vídeo que grava os acontecimentos permitindo que possamos revê-los tal como ocorreram.",
      "Síndrome das Falsas Memórias é o termo utilizado para designar casos em que testemunhas de crimes deram falsos testemunhos induzidas pelo interrogatório policial.",
      "Estudos indicam que os erros ou distorções de memória são apenas omissivos, ou seja, derivam do esquecimento do acontecimento.",
      "As pesquisas demonstram que as distorções nas lembranças são sempre comissivas, ou seja, são produzidas pela interferência externa.",
    ],
    correctLetter: "A",
  },
  {
    number: 77,
    prompt:
      "A reconhecida pesquisa de Psicologia Social realizada pelo psicólogo Philip Zimbardo na Universidade de Stanford, em que alunos simulavam o funcionamento de uma prisão, indicou a importância do grupo na compreensão da",
    options: [
      "inteligência.",
      "resistência.",
      "individualização.",
      "desindividualização.",
      "curiosidade.",
    ],
    correctLetter: "D",
  },
  {
    number: 78,
    prompt:
      "Com relação ao fenômeno da violência conjugal avalie se as afirmativas estão corretas.\nI. Deixou de ser considerado restrito ao âmbito privado para ser compreendido como um grave problema de saúde pública.\nII. Mulheres que presenciaram violência conjugal entre seus pais na infância tendem a desenvolver maior autoculpabilização se forem vítimas de agressões pelos parceiros, indicando uma perspectiva transgeracional da violência.\nIII. Embora homens heterossexuais tenham mais dificuldade em confessar a violência sofrida pela parceira, estatísticas indicam que eles também sofrem violência conjugal.\nEstá correto o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II, apenas", "I, II e III."],
    correctLetter: "E",
  },
  {
    number: 79,
    prompt: "Assinale a opção que caracteriza um infanticídio.",
    options: [
      "A lesão corporal culposa ou danosa que atinja a integridade física de uma criança por qualquer pessoa.",
      "A morte do filho pela mãe, durante o parto ou logo após, sob efeito do estado puerperal.",
      "A morte de crianças até os sete anos por qualquer cuidador ou responsável.",
      "O assassinato do filho pelos pais desde o parto até os cinco anos de idade.",
      "A lesão corporal danosa que atinja a integridade física de uma criança por quem esteja responsável por ela.",
    ],
    correctLetter: "B",
  },
  {
    number: 80,
    prompt:
      "Recentes alterações da lei Maria da Penha enfatizam a importância de que sejam pensadas propostas de reabilitação e educação dos agressores que pratiquem violência doméstica e familiar contra a mulher.\nEm função disso, experiências de grupos reflexivos para homens autores de violência doméstica vêm se multiplicando por todo o país com o objetivo de",
    options: [
      "substituir a pena que seria aplicada pelo magistrado no processo no Juizado.",
      "ser um condicionante para reconciliação do casal depois da denúncia de violência doméstica.",
      "funcionar como um espaço que possibilite a reflexão sobre o seu papel na construção da dinâmica de violência.",
      "refletir sobre a importância das masculinidades e dos papéis sexuais para a sobrevivência das famílias.",
      "considerar a corresponsabilidade da mulher nas agressões físicas que ela sofra pelo companheiro.",
    ],
    correctLetter: "C",
  },
  {
    number: 81,
    prompt: "Na perspectiva pós-estruturalista, gênero é entendido como",
    options: [
      "a forma que define a identidade biológica dos corpos humanos masculinos e femininos.",
      "um dispositivo de poder que constitui algumas identidades, entre elas, as de mulher e de homem.",
      "o elemento que descreve a personalidade e o comportamento do homem e da mulher.",
      "uma parte do sistema binário sexo/gênero, que diferencia o que é biologicamente definido do que é socialmente construído.",
      "estrutura biológica que diferencia e os corpos femininos e os masculinos.",
    ],
    correctLetter: "B",
  },
  {
    number: 82,
    prompt:
      "João, de 13 anos, pichou a escola em que estuda, cometendo ato infracional. O ato infracional é previsto no Estatuto da Criança e do Adolescente e se define como a conduta descrita como crime ou contravenção penal, quando praticada por criança ou por adolescente.\nDiante das condutas de João podem ser aplicadas",
    options: [
      "penas restritivas de direito e de privação de liberdade.",
      "penas de reparação de dano e medidas protetivas.",
      "medidas socioeducativas e medidas protetivas.",
      "pena de multa e medidas socioeducativas.",
      "penas de prestação de serviços à comunidade e multa.",
    ],
    correctLetter: "C",
  },
  {
    number: 83,
    prompt:
      "Durante o século XX o desenho passou a ser utilizado como técnica de avaliação psicológica, como instrumento útil na investigação de habilidades cognitivas e de personalidade.\nO House-Tree-Person Test ou Teste do Desenho da Casa – Árvore – Pessoa é o único teste gráfico projetivo para uso no contexto profissional da avaliação psicológica.\nEle objetiva",
    options: [
      "avaliar as habilidades cognitivas do sujeito que está sendo testado, dimensionando sua inteligência matemático-numérica e verbal.",
      "compreender aspectos da personalidade do indivíduo, bem como a forma desse indivíduo interagir com as pessoas e com o ambiente.",
      "dimensionar a capacidade que uma pessoa tem de focar a atenção ora em um estímulo, ora em outro.",
      "fornecer uma medida referente à capacidade de um indivíduo para buscar dois ou mais estímulos simultaneamente.",
      "avaliar a capacidade de memória visual de pessoas por meio de estímulos figurativos.",
    ],
    correctLetter: "B",
  },
  {
    number: 84,
    prompt:
      "Luciana tem 26 anos e emagreceu muito após romper o noivado com Carlos Antônio. Apesar do emagrecimento considerável, ela considera que esteja com sobrepeso, expressando-se forma depreciativa sobre o seu próprio corpo e manifestando-se ansiosa a cada vez que tem que ingerir algum alimento, contabilizando as calorias a cada refeição.\nOs sintomas de Luciana são sugestivos de",
    options: [
      "anorexia.",
      "compulsão alimentar.",
      "bulimia.",
      "ansiedade alimentar.",
      "comer emocional.",
    ],
    correctLetter: "A",
  },
  {
    number: 85,
    prompt:
      "Assinale o conceito a seguir que não faz parte da Teoria de Personalidade desenvolvida por Jung.",
    options: [
      "Inconsciente coletivo.",
      "Anima e animus.",
      "Arquétipo de Grande Mãe.",
      "Projeção da sombra.",
      "Zona de Desenvolvimento Proximal.",
    ],
    correctLetter: "E",
  },
  {
    number: 86,
    prompt:
      "De acordo com as disposições contidas na Instrução Normativa nº 78/2014 da Polícia Federal, a expedição do laudo psicológico que ateste a aptidão psicológica para o manuseio de arma de fogo e para exercer a profissão de vigilante deve ser baseada em bateria que deverá contar com, no mínimo,",
    options: [
      "1 teste projetivo, 1 teste expressivo, 1 teste de memória, 1 teste de atenção difusa e concentrada e 1 entrevista semiestruturada.",
      "2 testes projetivos, 2 testes expressivos, 2 testes de memória, 2 testes de atenção difusa e concentrada e 2 entrevistas semiestruturadas.",
      "3 testes projetivos, 3 testes expressivos, 3 testes de memória, 3 testes de atenção difusa e concentrada e 3 entrevistas semiestruturadas.",
      "4 testes projetivos, 4 testes expressivos, 4 testes de memória, 4 testes de atenção difusa e concentrada e 4 entrevistas semiestruturadas.",
      "5 testes projetivos, 5 testes expressivos, 5 testes de memória, 5 testes de atenção difusa e concentrada e 5 entrevistas semiestruturadas.",
    ],
    correctLetter: "A",
  },
  {
    number: 87,
    prompt:
      "Muito embora o experimento social desenvolvido pelo psicólogo Stanley Milgram, em 1964, com imposição de choques elétricos, esteja sendo questionado atualmente, prêmios foram concedidos à pesquisa, pois se tratou de iniciativa pioneira para entender algumas das dinâmicas associadas ao nazismo.\nAquela experiência social buscou analisar",
    options: [
      "a tolerância à frustração.",
      "o apego à figura materna.",
      "a obediência à autoridade.",
      "a inteligência adaptativa.",
      "o estresse pós-traumático.",
    ],
    correctLetter: "C",
  },
  {
    number: 88,
    prompt:
      "Clarice e João casaram-se mas não conseguiram ter filhos biológicos, optando pela via da adoção; para tanto, ingressaram com processo de habilitação para adotar uma criança de até dois anos de idade. Como parte do processo, avalie se eles devem passar por estudo psicológico, que, entre outras intervenções, pode:\nI. Avaliar a maturidade do casal diante do projeto adotivo.\nII. Considerar o luto emocional diante da impossibilidade de gestação biológica.\nIII. Investigar as condições socioeconômicas da família como condição para adoção.\nEstá correto o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II.", "I e III."],
    correctLetter: "D",
  },
  {
    number: 89,
    prompt:
      "Emergindo como modelo alternativo às formas tradicionais de resolução de conflitos propostas pelo Judiciário, a Justiça Restaurativa",
    options: [
      "exige que o infrator receba uma punição por um crime proporcional e semelhante ao seu delito, seja pela privação de liberdade ou pagamento de multa.",
      "prioriza o passado, pois foi o momento em que a ação ou a omissão delituosa aconteceu, sendo interesse do estado o direito de punir o autor do crime.",
      "olha para o tripé vítima-ofensor-comunidade, visando a ajudar na superação do trauma pela vítima, a responsabilizar o ofensor pelo crime e a reparar o dano para a sociedade.",
      "considera a culpa de forma individual, conduzindo o processo penal com base no Direito dogmático pelos operadores da jurídicos e as autoridades competentes.",
      "cria a polarização entre infrator e vítima, onde a vítima atua como mero figurante do processo, enquanto o ofensor é representado pelo advogado.",
    ],
    correctLetter: "C",
  },
  {
    number: 90,
    prompt:
      "A abordagem terapêutica desenvolvida por Jacob Moreno, aplicável a intervenções individuais e grupais, que permite a expressão livre e a exploração de sentimentos e pensamentos é",
    options: [
      "o teatro do oprimido.",
      "o psicodrama.",
      "a terapia cognitivo comportamental.",
      "a terapia holística.",
      "a terapia existencial.",
    ],
    correctLetter: "B",
  },
  {
    number: 91,
    prompt:
      "A Resolução CFP nº 31, de 15 de dezembro de 2022, estabelece diretrizes para a realização de Avaliação Psicológica no exercício profissional da psicóloga e do psicólogo, regulamenta o Sistema de Avaliação de Testes Psicológicos – SATEPSI e revoga a Resolução CFP nº 09/2018.\nEm relação ao tema, analise as afirmativas a seguir:\nI. Documentos técnicos, tais como protocolos ou relatórios de equipes multiprofissionais são fontes fundamentais de informação.\nII. A utilização de testes psicológicos com parecer desfavorável, ou que constem na lista de Testes Psicológicos Não Avaliados no site do SATEPSI, será considerada falta ética.\nIII. As psicólogas e os psicólogos não poderão elaborar, validar, traduzir, adaptar, normatizar, comercializar e fomentar instrumentos ou técnicas psicológicas, para criar, manter ou reforçar preconceitos, estigmas ou estereótipos.\nEstá correto o que se afirma em",
    options: ["I, apenas.", "III, apenas.", "I e II, apenas.", "II e III, apenas.", "I, II e III."],
    correctLetter: "E",
  },
  {
    number: 92,
    prompt:
      "A Resolução CFP nº 6, de 29 de março de 2019, institui regras para a elaboração de documentos escritos produzidos pela(o) psicóloga(o) no exercício profissional.\nDe acordo com a Resolução, é correto afirmar que",
    options: [
      "a declaração tem por finalidade detalhar a prestação do serviço realizado e deve conter o registro de sintomas, situações ou estados psicológicos.",
      "é obrigatório, no atestado psicológico, o uso da Classificação Internacional de Doenças (CID) como fonte para enquadramento de diagnóstico.",
      "o relatório visa a comunicar a atuação profissional da(o) psicóloga(o) em diferentes processos de trabalho já desenvolvidos com finalidade de produzir diagnóstico psicológico.",
      "orienta-se no relatório multiprofissional que cada profissional faça sua análise separadamente, identificando, com subtítulo, o nome e a categoria profissional.",
      "o laudo psicológico deve fornecer informações que ultrapassem a demanda e relatar o diagnóstico, o prognóstico, a evolução do caso e a medida institucional a ser tomada.",
    ],
    correctLetter: "D",
  },
  {
    number: 93,
    prompt:
      "A resolução CFP 008/2010 dispõe sobre a atuação do psicólogo como perito e assistente técnico no Poder Judiciário.\nCom relação às atribuições e à interação profissional entre o perito e o assistente técnico, assinale (V) para a afirmativa verdadeira e (F) para a falsa.\n( ) O psicólogo perito apresentará indicativos pertinentes à sua investigação que possam diretamente subsidiar o Juiz na solicitação realizada, reconhecendo os limites legais de sua atuação profissional, sem adentrar nas decisões, que são exclusivas às atribuições dos magistrados.\n( ) Recomenda-se que o perito e o assistente técnico estejam presentes durante a realização dos procedimentos metodológicos que norteiam os atendimentos, evitando, assim, contestação ou impugnação do documento psicológico.\n( ) Para desenvolver sua função, o assistente técnico poderá ouvir pessoas envolvidas, solicitar documentos em poder das partes, entre outros meios.\nAs afirmativas são, respectivamente,",
    options: ["V – F – V.", "F – V – V.", "V – F – F.", "V – V – F.", "F – F – V."],
    correctLetter: "A",
  },
  {
    number: 94,
    prompt:
      "A Alienação Parental é um assunto bastante polêmico, de forma que o Conselho Federal de Psicologia emitiu a nota técnica nº 4/2022/GTEC/CG que versa sobre os impactos da Lei nº 12.318/2010 na atuação das psicólogas e dos psicólogos.\nUm dos apontamentos críticos feitos em relação à lei da Alienação Parental é que seu texto",
    options: [
      "ignora a complexidade das situações de conflito familiar e promove a judicialização na qual mães e pais são reduzidos às categorias de vítima e algoz.",
      "preconiza que os tribunais deveriam ser indicados para capacitar o(a) psicólogo(a) a discriminar no ato investigativo de avaliação psicológica a falsa denúncia de abuso sexual e o abuso sexual de fato ocorrido.",
      'designa o psicólogo e/ou o assistente social como responsáveis por conduzir a "visitação assistida no fórum", mas não define os parâmetros que devem nortear tal intervenção.',
      "privilegia a realização de estudos técnicos por profissionais servidores públicos, discriminando e subvalorizando os profissionais externos ao judiciário e que atuam no âmbito privado.",
      "define os procedimentos a serem adotados pelos profissionais para a identificação do ilícito civil com base nas normativas do Conselho Federal de Psicologia, contudo, não elenca todos os procedimentos específicos da profissão.",
    ],
    correctLetter: "A",
  },
  // Questão 95 (Gabriel/Fernanda, sigilo profissional) foi ANULADA pelo
  // gabarito oficial definitivo — sem resposta correta oficial, por isso
  // não é importada.
  {
    number: 96,
    prompt:
      "A dinâmica da violência conjugal corresponde em geral a um processo cíclico, relacional e progressivo, composta por três fases. Uma dessas fases seria a principal responsável pela permanência dos cônjuges em relações violentas, pois seria alimentada pela esperança de um relacionamento melhor, calcado nas promessas e no arrependimento do agressor.\nDe forma persuasiva, o agressor convida a vítima para entrar, novamente, no circuito da situação abusiva.\nTal fase é chamada de",
    options: [
      "explosão.",
      "lua de mel.",
      "aumento de tensão.",
      "redenção e superação.",
      "amorosidade superficial.",
    ],
    correctLetter: "B",
  },
  {
    number: 97,
    prompt:
      "Em um contexto de reiteradas mortes de parte da população jovem, negra e periférica pela violência, a Psicologia Brasileira pode contribuir efetivamente para reverter a situação e promover uma sociedade mais igualitária e democrática, o que passa pelo enfrentamento das desigualdades raciais, de classe e gênero.\nAvalie se entre os princípios capazes de balizar a inserção da Psicologia no campo da formulação, gestão e execução de políticas públicas de segurança no Brasil, incluem-se:\nI. Garantia e ampliação de direitos humanos.\nII. Direito à cidade aos diversos segmentos sociais.\nIII. Investimento em políticas carcerárias e de combate ao crime organizado.\nEstá correto o que se afirma em",
    options: ["I, apenas.", "II, apenas.", "III, apenas.", "I e II, apenas.", "I e III, apenas."],
    correctLetter: "D",
  },
  {
    number: 98,
    prompt:
      "No decorrer de sua obra, Freud associa o caráter a certos tipos libidinais, ao mesmo tempo em que traça a sua distinção em relação ao sintoma. Na formação do caráter, há o predomínio de formações reativas ou até mesmo de sublimação, assumindo o seu papel de resistência em face das excitações pulsionais.\nPor sua vez, o sintoma, característico das psiconeuroses, tem como base constitutiva o mecanismo de",
    options: ["forclusão.", "denegação.", "devaneio.", "acting-out.", "recalque."],
    correctLetter: "E",
  },
  {
    number: 99,
    prompt:
      "Achille Mbembe é um importante pensador camaronês que faz uma releitura das noções ligadas ao racismo de Estado trazidas por Michel Foucault, juntamente com contribuições teóricas de outros autores também importantes para refletir sobre as relações entre Estado, violência e colonialidade. Como exemplo, a chamada guerra às drogas como política de Estado produz práticas de desumanização, criminalização e extermínio de grupos socialmente vulneráveis.\nPara pensar essa forma de gestão, Mbembe cria o conceito chave de",
    options: [
      "biopoder.",
      "biopolítica.",
      "necropolítica.",
      "banalidade do mal.",
      "estado de exceção.",
    ],
    correctLetter: "C",
  },
  {
    number: 100,
    prompt:
      "O reconhecimento da ocorrência de violência contra crianças e adolescentes trouxe como consequência direta a necessidade de protegê-las.\nEm relação ao tema, analise as afirmativas a seguir:\nI. As relações de dominação e subordinação são naturalizadas histórica e socialmente por meio de discursos que defendem o uso da violência como estratégia educativa, prática que revela o processo multigeracional do fenômeno.\nII. As estratégias de enfrentamento da violência contra crianças e adolescentes devem visar a reparação dos danos causados pelos agressores haja vista se tratar de um fenômeno cuja causalidade é linear e de natureza individual.\nIII. As consequências da violência para as vítimas variam de acordo com o apoio social e afetivo por elas obtidos após a ocorrência do ato violento, podendo, assim, atenuar os seus efeitos sobre as crianças e os adolescentes.\nEstá correto apenas o que se afirma em",
    options: ["I.", "III.", "I e II.", "I e III.", "II e III."],
    correctLetter: "D",
  },
];

const LETTER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

async function main() {
  const actor = await resolveSeedActor();

  // --- Source (procedência oficial) ---
  let source = await prisma.source.findFirst({
    where: { name: "Concurso Público Psicólogo Policial Civil — PCSC (FGV, Edital nº 2/2023)" },
  });
  if (!source) {
    source = await createSource(actor, {
      name: "Concurso Público Psicólogo Policial Civil — PCSC (FGV, Edital nº 2/2023)",
      sourceType: "OFICIAL",
      classification: "OFICIAL",
      institution: "FGV Conhecimento / Polícia Civil do Estado de Santa Catarina (ACADEPOL)",
      url: "https://conhecimento.fgv.br/concursos/pcsc23/2",
      publishedAt: new Date("2024-01-28"),
      accessedAt: new Date(),
      rightsNote:
        "Prova de concurso público (ato administrativo oficial), reproduzida a partir dos PDFs oficiais " +
        "hospedados pela própria banca (FGV Conhecimento): caderno de questões Tipo 1/Branca " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/psicologo-policial-civil-objetivacns001-tipo-1.pdf) " +
        "e gabarito definitivo pós-recursos, publicado em 26/02/2024 " +
        "(https://conhecimento.fgv.br/sites/default/files/concursos/pcscpsicologo2024_gabarito_definitivo_20240220.pdf). " +
        'Só as 40 questões do bloco "Psicologia" (61-100) foram importadas; a questão 95 foi excluída por ter sido ' +
        "anulada no gabarito oficial.",
    });
    console.log(`[seed-exam-pcsc] Source criada: ${source.id}`);
  } else {
    console.log(`[seed-exam-pcsc] Source já existe: ${source.id}`);
  }
  if (source.status !== "PUBLISHED") {
    source = await prisma.source.update({
      where: { id: source.id },
      data: { status: "PUBLISHED" },
    });
  }

  // --- ExamBoard ---
  let examBoard = await prisma.examBoard.findUnique({ where: { slug: "fgv" } });
  if (!examBoard) {
    examBoard = await createExamBoard(actor, {
      slug: "fgv",
      name: "FGV (Fundação Getulio Vargas)",
    });
    console.log(`[seed-exam-pcsc] ExamBoard criada: ${examBoard.id}`);
  }
  if (examBoard.status !== "PUBLISHED") {
    await prisma.examBoard.update({ where: { id: examBoard.id }, data: { status: "PUBLISHED" } });
  }

  // --- Organization ---
  let organization = await prisma.organization.findUnique({ where: { slug: "policia-civil-sc" } });
  if (!organization) {
    organization = await createOrganization(actor, {
      slug: "policia-civil-sc",
      name: "Polícia Civil do Estado de Santa Catarina",
    });
    console.log(`[seed-exam-pcsc] Organization criada: ${organization.id}`);
  }
  if (organization.status !== "PUBLISHED") {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { status: "PUBLISHED" },
    });
  }

  // --- Position ---
  let position = await prisma.position.findUnique({ where: { slug: "psicologo-policial-civil" } });
  if (!position) {
    position = await createPosition(actor, {
      slug: "psicologo-policial-civil",
      name: "Psicólogo Policial Civil",
    });
    console.log(`[seed-exam-pcsc] Position criada: ${position.id}`);
  }
  if (position.status !== "PUBLISHED") {
    await prisma.position.update({ where: { id: position.id }, data: { status: "PUBLISHED" } });
  }

  // --- Exam ---
  let exam = await prisma.exam.findUnique({
    where: { slug: "concurso-psicologo-policial-civil-sc" },
  });
  if (!exam) {
    exam = await createExam(actor, {
      slug: "concurso-psicologo-policial-civil-sc",
      name: "Concurso Público — Psicólogo Policial Civil (Santa Catarina)",
    });
    console.log(`[seed-exam-pcsc] Exam criado: ${exam.id}`);
  }
  if (exam.status !== "PUBLISHED") {
    await publishExam(actor, exam.id);
  }

  // --- ExamEdition ---
  const editionName = "Edital nº 2/2023 — Prova aplicada em 28/01/2024 (bloco Psicologia)";
  let edition = await prisma.examEdition.findFirst({
    where: { examId: exam.id, name: editionName },
  });
  if (!edition) {
    edition = await createExamEdition(actor, {
      examId: exam.id,
      name: editionName,
      year: 2024,
      examBoardId: examBoard.id,
      organizationId: organization.id,
      positionId: position.id,
      sourceId: source.id,
    });
    console.log(`[seed-exam-pcsc] ExamEdition criada: ${edition.id}`);
  } else {
    console.log(`[seed-exam-pcsc] ExamEdition já existe: ${edition.id}`);
  }
  if (edition.status !== "PUBLISHED") {
    await publishExamEdition(actor, edition.id);
  }

  // --- Questions ---
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
      explanation: `Questão ${q.number} da prova oficial (Tipo 1/Branca). Gabarito definitivo FGV: alternativa ${q.correctLetter}.`,
      options: q.options.map((text, i) => ({ text, isCorrect: i === correctIndex, order: i })),
    });
    await publishQuestion(actor, question.id);
    created++;
  }

  console.log(
    `\n[seed-exam-pcsc] concluído: ${created} questão(ões) criada(s), ${skipped} já existiam.`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-exam-pcsc] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
