/**
 * Formatação de apresentação (Módulo 11) — SÓ rótulos/strings, nunca
 * cálculo de negócio (seção 4: "a UI não é a autoridade dos dados"). Todo
 * número/percentual/prioridade que aparece aqui já veio calculado do
 * servidor; estas funções só decidem COMO mostrar, nunca QUANTO.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(date: Date | string): string {
  return DATE_FORMATTER.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return DATE_TIME_FORMATTER.format(new Date(date));
}

/** `85.5` → `"85,5%"` — só formatação, o número já vem pronto do servidor. */
export function formatPercentage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function formatInteger(value: number): string {
  return value.toLocaleString("pt-BR");
}

/**
 * "Atrasada há N dia(s)" (Módulo 11, seção 18) — só formatação de exibição
 * de uma data já vencida (`dueAt` real, calculado pelo Módulo 5); não
 * decide se o item está vencido nem recalcula prioridade/estado (seção 4).
 */
export function formatOverdueDuration(dueAt: Date | string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(dueAt).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Vence hoje";
  if (days === 1) return "Atrasada há 1 dia";
  return `Atrasada há ${days} dias`;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  TRUE_FALSE: "Verdadeiro ou falso",
  MULTI_SELECT: "Seleção múltipla",
  ORDERING: "Ordenação",
  MATCHING: "Associação",
  FILL_BLANK: "Preencher lacuna",
  SHORT_ANSWER: "Resposta curta",
  CASE_STUDY: "Estudo de caso",
};
export function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
  DOMINIO: "Domínio",
};
export function difficultyLabel(difficulty: string | null | undefined): string {
  if (!difficulty) return "Sem dificuldade definida";
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

const LESSON_PROGRESS_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  MASTERED: "Dominada",
};
export function lessonProgressStatusLabel(status: string): string {
  return LESSON_PROGRESS_STATUS_LABELS[status] ?? status;
}

const STUDY_ACTION_TYPE_LABELS: Record<string, string> = {
  START_DIAGNOSTIC: "Diagnóstico inicial",
  LESSON: "Lição",
  REVIEW: "Revisão",
  QUESTION: "Questões",
  SIMULATION: "Simulado",
  LIBRARY: "Biblioteca",
  CURRENT_AFFAIR: "Atualidade",
};
export function studyActionTypeLabel(type: string): string {
  return STUDY_ACTION_TYPE_LABELS[type] ?? type;
}

const LIBRARY_MATERIAL_TYPE_LABELS: Record<string, string> = {
  LIVRO: "Livro",
  EBOOK: "E-book",
  ARTIGO: "Artigo",
  MONOGRAFIA: "Monografia",
  TESE: "Tese",
  DISSERTACAO: "Dissertação",
  MATERIAL_DIDATICO: "Material didático",
  DOCUMENTO: "Documento",
  OUTRO: "Outro",
};
export function libraryMaterialTypeLabel(type: string): string {
  return LIBRARY_MATERIAL_TYPE_LABELS[type] ?? type;
}

const REVIEW_STATE_LABELS: Record<string, string> = {
  NEW: "Novo",
  LEARNING: "Aprendendo",
  REVIEW: "Em revisão",
  MASTERED: "Dominado",
  SUSPENDED: "Suspenso",
};
export function reviewStateLabel(state: string): string {
  return REVIEW_STATE_LABELS[state] ?? state;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  INTRO: "Introdução",
  CONCEPT: "Conceito",
  EXAMPLE: "Exemplo",
  QUESTION: "Atividade",
  CONCLUSION: "Conclusão",
};
export function blockTypeLabel(type: string): string {
  return BLOCK_TYPE_LABELS[type] ?? type;
}

// ---- Módulo 12 (rótulos administrativos) -----------------------------------

const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};
export function publicationStatusLabel(status: string): string {
  return PUBLICATION_STATUS_LABELS[status] ?? status;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  AUTORAL: "Autoral",
  LICENCIADO: "Licenciado",
  OFICIAL: "Oficial",
  ACADEMICA: "Acadêmica",
  DIDATICA: "Didática",
  ADMINISTRATIVA: "Administrativa",
  EXTERNA: "Externa",
};
export function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_LABELS[type] ?? type;
}

const ACADEMIC_WORK_TYPE_LABELS: Record<string, string> = {
  LIVRO: "Livro",
  ARTIGO: "Artigo",
  ENSAIO: "Ensaio",
  EXPERIMENTO_PUBLICADO: "Experimento publicado",
  DOCUMENTO: "Documento",
  TEORIA_PUBLICADA: "Teoria publicada",
  OUTRO: "Outro",
};
export function academicWorkTypeLabel(type: string): string {
  return ACADEMIC_WORK_TYPE_LABELS[type] ?? type;
}

const FREE_ACCESS_REASON_LABELS: Record<string, string> = {
  PUBLIC_DOMAIN: "Domínio público",
  OPEN_LICENSE: "Licença aberta",
  AUTHOR_PROVIDED: "Cedido pelo autor",
  INSTITUTIONAL_ACCESS: "Acesso institucional",
  OFFICIAL_FREE_ACCESS: "Acesso gratuito oficial",
};
export function freeAccessReasonLabel(reason: string): string {
  return FREE_ACCESS_REASON_LABELS[reason] ?? reason;
}

const CURRENT_AFFAIR_RELEVANCE_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MODERATE: "Moderada",
  HIGH: "Alta",
};
export function currentAffairRelevanceLabel(relevance: string): string {
  return CURRENT_AFFAIR_RELEVANCE_LABELS[relevance] ?? relevance;
}

const KNOWLEDGE_ENTITY_TYPE_LABELS: Record<string, string> = {
  PERSON: "Pessoa",
  WORK: "Obra",
  THEORY: "Teoria",
  CONCEPT: "Conceito",
  SCHOOL: "Escola/corrente",
  DISCIPLINE: "Disciplina",
  PERIOD: "Período histórico",
  DEVELOPMENTAL_STAGE: "Estágio de desenvolvimento",
};
export function knowledgeEntityTypeLabel(type: string): string {
  return KNOWLEDGE_ENTITY_TYPE_LABELS[type] ?? type;
}

const STAGE_TYPE_LABELS: Record<string, string> = {
  LESSON: "Lição",
  REVIEW: "Revisão",
  CHECKPOINT: "Checkpoint",
  CHALLENGE: "Desafio",
};
export function stageTypeLabel(type: string): string {
  return STAGE_TYPE_LABELS[type] ?? type;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Atualização",
  PUBLISH: "Publicação",
  ARCHIVE: "Arquivamento",
  RESTORE: "Restauração",
  LINK: "Vínculo",
  UNLINK: "Desvínculo",
};
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
