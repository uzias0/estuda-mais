/**
 * Registro central das entidades administrativas "simples" (Módulo 12) —
 * todas com o mesmo esqueleto de serviço já confirmado no levantamento do
 * Módulo 2/3/4 (`create(actor,input)`, `update(actor,id,input)`,
 * `get(id)`, `list(params)`, e opcionalmente `publish(actor,id)`/
 * `archive(actor,id)`). Em vez de 14 páginas + 14 Server Actions quase
 * idênticas, este arquivo descreve CADA entidade uma única vez (rótulos,
 * campos de formulário, e as funções de serviço reais a chamar) e
 * `src/app/admin/**\/[entity]/page.tsx` + `src/server/actions/admin/
 * simple-entity-actions.ts` são genéricos, dirigidos por esta config.
 *
 * Isto NÃO introduz nenhuma regra de negócio nova — é só uma tabela de
 * despacho para funções que já existem e já validam/autorizam/auditam por
 * conta própria (seção 26 do prompt: "antes de criar... procure no projeto
 * inteiro. Se já existir, REUTILIZE"). Entidades com relações/formulários
 * ricos demais para esta forma genérica (Concept, AcademicPerson,
 * AcademicWork, AcademicRelation, Question, ExamEdition, Track, Lesson)
 * ficam de fora de propósito — têm página própria (bespoke), documentado em
 * `docs/MODULO-12.md`.
 */
import type { Actor } from "@/server/auth/authorize";

import {
  createDiscipline,
  updateDiscipline,
  publishDiscipline,
  archiveDiscipline,
  getDiscipline,
  listDisciplines,
} from "@/modules/knowledge/server/services/discipline.service";
import {
  createSchool,
  updateSchool,
  publishSchool,
  archiveSchool,
  getSchool,
  listSchools,
} from "@/modules/knowledge/server/services/school.service";
import {
  createTheory,
  updateTheory,
  publishTheory,
  archiveTheory,
  getTheory,
  listTheories,
} from "@/modules/knowledge/server/services/theory.service";
import {
  createHistoricalPeriod,
  updateHistoricalPeriod,
  getHistoricalPeriod,
  listHistoricalPeriods,
} from "@/modules/knowledge/server/services/historicalPeriod.service";
import {
  createDevelopmentalStage,
  updateDevelopmentalStage,
  getDevelopmentalStage,
  listDevelopmentalStages,
} from "@/modules/knowledge/server/services/developmentalStage.service";
import {
  createTag,
  updateTag,
  getTag,
  listTags,
} from "@/modules/knowledge/server/services/tag.service";
import {
  createExam,
  updateExam,
  publishExam,
  archiveExam,
  getExam,
  listExams,
} from "@/modules/assessment/server/services/exam.service";
import {
  createExamBoard,
  updateExamBoard,
  publishExamBoard,
  archiveExamBoard,
  getExamBoard,
  listExamBoards,
  createOrganization,
  updateOrganization,
  publishOrganization,
  archiveOrganization,
  getOrganization,
  listOrganizations,
  createPosition,
  updatePosition,
  publishPosition,
  archivePosition,
  getPosition,
  listPositions,
} from "@/modules/assessment/server/services/examReference.service";
import {
  createLearningArea,
  updateLearningArea,
  publishLearningArea,
  archiveLearningArea,
  getLearningArea,
  listLearningAreas,
} from "@/modules/pedagogy/server/services/learning-area.service";
import {
  createUnit,
  updateUnit,
  publishUnit,
  archiveUnit,
  getUnit,
  listUnits,
} from "@/modules/pedagogy/server/services/unit.service";
import {
  createStage as createPedagogyStage,
  updateStage as updatePedagogyStage,
  publishStage as publishPedagogyStage,
  archiveStage as archivePedagogyStage,
  getStage as getPedagogyStage,
  listStages as listPedagogyStages,
} from "@/modules/pedagogy/server/services/stage.service";
import {
  createLesson,
  updateLesson,
  publishLesson,
  archiveLesson,
  getLesson,
  listLessons,
} from "@/modules/pedagogy/server/services/lesson.service";
import { listDisciplines as listDisciplinesForSelect } from "@/modules/knowledge/server/services/discipline.service";
import { listSchools as listSchoolsForSelect } from "@/modules/knowledge/server/services/school.service";
import { listHistoricalPeriods as listPeriodsForSelect } from "@/modules/knowledge/server/services/historicalPeriod.service";

export type SimpleFieldType = "text" | "textarea" | "number" | "select";

export interface SimpleFieldOption {
  value: string;
  label: string;
}

export interface SimpleFieldConfig {
  name: string;
  label: string;
  type: SimpleFieldType;
  required?: boolean;
  helpText?: string;
  loadOptions?: () => Promise<SimpleFieldOption[]>;
  staticOptions?: SimpleFieldOption[];
}

export interface SimpleEntityListParams {
  status?: string;
  take?: number;
  skip?: number;
}

export interface SimpleEntityConfig {
  key: string;
  label: string;
  labelSingular: string;
  basePath: string;
  primaryLabelField: "name" | "title";
  hasSlug: boolean;
  hasStatus: boolean;
  hasPublish: boolean;
  supportsStatusFilter: boolean;
  fields: SimpleFieldConfig[];
  service: {
    // `input`/retorno como `any` deliberadamente: este registro despacha para
    // 14 assinaturas de domínio estruturalmente heterogêneas (cada entidade
    // tem seu próprio *CreateInput* Zod-derivado) — um tipo genérico único
    // não conseguiria expressar isso sem perder a checagem real de cada
    // serviço individual (que já existe e já roda em cada `create*`/
    // `update*` via `.parse()`). A validação de forma continua 100% nos
    // serviços de domínio; esta tabela só precisa saber "existe e retorna
    // algo com `id`", verificado nas Server Actions genéricas que a chamam.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (actor: Actor, input: any) => Promise<{ id: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (actor: Actor, id: string, input: any) => Promise<unknown>;
    publish?: (actor: Actor, id: string) => Promise<unknown>;
    archive?: (actor: Actor, id: string) => Promise<unknown>;
    get: (id: string) => Promise<Record<string, unknown> | null>;
    list: (params: SimpleEntityListParams) => Promise<Record<string, unknown>[]>;
  };
}

const nameField: SimpleFieldConfig = { name: "name", label: "Nome", type: "text", required: true };
const descriptionField: SimpleFieldConfig = {
  name: "description",
  label: "Descrição",
  type: "textarea",
};

async function periodOptions(): Promise<SimpleFieldOption[]> {
  const periods = await listPeriodsForSelect({ take: 200 });
  return periods.map((p) => ({ value: p.id, label: p.name }));
}
async function disciplineOptions(): Promise<SimpleFieldOption[]> {
  const disciplines = await listDisciplinesForSelect({ take: 200 });
  return disciplines.map((d) => ({ value: d.id, label: d.name }));
}
async function schoolOptions(): Promise<SimpleFieldOption[]> {
  const schools = await listSchoolsForSelect({ take: 200 });
  return schools.map((s) => ({ value: s.id, label: s.name }));
}

export const SIMPLE_ENTITIES: Record<string, SimpleEntityConfig> = {
  disciplines: {
    key: "disciplines",
    label: "Disciplinas",
    labelSingular: "Disciplina",
    basePath: "/admin/knowledge/disciplines",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField, descriptionField],
    service: {
      create: createDiscipline,
      update: updateDiscipline,
      publish: publishDiscipline,
      archive: archiveDiscipline,
      get: getDiscipline,
      list: (p) => listDisciplines({ take: p.take, skip: p.skip }),
    },
  },
  schools: {
    key: "schools",
    label: "Escolas / correntes",
    labelSingular: "Escola/corrente",
    basePath: "/admin/knowledge/schools",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField, descriptionField],
    service: {
      create: createSchool,
      update: updateSchool,
      publish: publishSchool,
      archive: archiveSchool,
      get: getSchool,
      list: (p) => listSchools({ take: p.take, skip: p.skip }),
    },
  },
  theories: {
    key: "theories",
    label: "Teorias",
    labelSingular: "Teoria",
    basePath: "/admin/knowledge/theories",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [
      nameField,
      descriptionField,
      {
        name: "originPeriodId",
        label: "Período de origem",
        type: "select",
        loadOptions: periodOptions,
        helpText: "Opcional.",
      },
    ],
    service: {
      create: createTheory,
      update: updateTheory,
      publish: publishTheory,
      archive: archiveTheory,
      get: getTheory,
      list: (p) => listTheories({ take: p.take, skip: p.skip }),
    },
  },
  periods: {
    key: "periods",
    label: "Períodos históricos",
    labelSingular: "Período histórico",
    basePath: "/admin/knowledge/periods",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: false,
    hasPublish: false,
    supportsStatusFilter: false,
    fields: [
      nameField,
      { name: "startYear", label: "Ano inicial", type: "number" },
      { name: "endYear", label: "Ano final", type: "number" },
      descriptionField,
    ],
    service: {
      create: createHistoricalPeriod,
      update: updateHistoricalPeriod,
      get: getHistoricalPeriod,
      list: (p) => listHistoricalPeriods({ take: p.take, skip: p.skip }),
    },
  },
  "developmental-stages": {
    key: "developmental-stages",
    label: "Estágios de desenvolvimento",
    labelSingular: "Estágio de desenvolvimento",
    basePath: "/admin/knowledge/developmental-stages",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: false,
    hasPublish: false,
    supportsStatusFilter: false,
    fields: [nameField, { name: "order", label: "Ordem", type: "number", required: true }],
    service: {
      create: createDevelopmentalStage,
      update: updateDevelopmentalStage,
      get: getDevelopmentalStage,
      list: () => listDevelopmentalStages(),
    },
  },
  tags: {
    key: "tags",
    label: "Tags",
    labelSingular: "Tag",
    basePath: "/admin/knowledge/tags",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: false,
    hasPublish: false,
    supportsStatusFilter: false,
    fields: [nameField],
    service: {
      create: createTag,
      update: updateTag,
      get: getTag,
      list: () => listTags(),
    },
  },
  exams: {
    key: "exams",
    label: "Provas",
    labelSingular: "Prova",
    basePath: "/admin/exams",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField],
    service: {
      create: createExam,
      update: updateExam,
      publish: publishExam,
      archive: archiveExam,
      get: getExam,
      list: (p) => listExams({ take: p.take, skip: p.skip }),
    },
  },
  "exam-boards": {
    key: "exam-boards",
    label: "Bancas",
    labelSingular: "Banca",
    basePath: "/admin/exams/boards",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField],
    service: {
      create: createExamBoard,
      update: updateExamBoard,
      publish: publishExamBoard,
      archive: archiveExamBoard,
      get: async (id) => getExamBoard(id),
      list: (p) => Promise.resolve(listExamBoards({ take: p.take, skip: p.skip })),
    },
  },
  organizations: {
    key: "organizations",
    label: "Órgãos/organizações",
    labelSingular: "Órgão/organização",
    basePath: "/admin/exams/organizations",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField],
    service: {
      create: createOrganization,
      update: updateOrganization,
      publish: publishOrganization,
      archive: archiveOrganization,
      get: async (id) => getOrganization(id),
      list: (p) => Promise.resolve(listOrganizations({ take: p.take, skip: p.skip })),
    },
  },
  positions: {
    key: "positions",
    label: "Cargos",
    labelSingular: "Cargo",
    basePath: "/admin/exams/positions",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: false,
    fields: [nameField],
    service: {
      create: createPosition,
      update: updatePosition,
      publish: publishPosition,
      archive: archivePosition,
      get: async (id) => getPosition(id),
      list: (p) => Promise.resolve(listPositions({ take: p.take, skip: p.skip })),
    },
  },
  areas: {
    key: "areas",
    label: "Áreas de conhecimento",
    labelSingular: "Área de conhecimento",
    basePath: "/admin/pedagogy/areas",
    primaryLabelField: "name",
    hasSlug: true,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: true,
    fields: [nameField],
    service: {
      create: createLearningArea,
      update: updateLearningArea,
      publish: publishLearningArea,
      archive: archiveLearningArea,
      get: getLearningArea,
      list: (p) => listLearningAreas({ status: p.status as never, take: p.take, skip: p.skip }),
    },
  },
  units: {
    key: "units",
    label: "Unidades",
    labelSingular: "Unidade",
    basePath: "/admin/pedagogy/units",
    primaryLabelField: "name",
    hasSlug: false,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: true,
    fields: [
      nameField,
      {
        name: "primaryDisciplineId",
        label: "Disciplina âncora",
        type: "select",
        loadOptions: disciplineOptions,
        helpText: "Opcional — a Unit não é dona deste conhecimento, só aponta para ele.",
      },
      {
        name: "primarySchoolId",
        label: "Escola/corrente âncora",
        type: "select",
        loadOptions: schoolOptions,
        helpText: "Opcional.",
      },
    ],
    service: {
      create: createUnit,
      update: updateUnit,
      publish: publishUnit,
      archive: archiveUnit,
      get: getUnit,
      list: (p) => listUnits({ status: p.status as never, take: p.take, skip: p.skip }),
    },
  },
  stages: {
    key: "stages",
    label: "Etapas",
    labelSingular: "Etapa",
    basePath: "/admin/pedagogy/stages",
    primaryLabelField: "name",
    hasSlug: false,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: true,
    fields: [
      nameField,
      {
        name: "type",
        label: "Tipo",
        type: "select",
        staticOptions: [
          { value: "LESSON", label: "Lição" },
          { value: "REVIEW", label: "Revisão" },
          { value: "CHECKPOINT", label: "Checkpoint" },
          { value: "CHALLENGE", label: "Desafio" },
        ],
      },
      { name: "xpReward", label: "XP de recompensa", type: "number" },
    ],
    service: {
      create: createPedagogyStage,
      update: updatePedagogyStage,
      publish: publishPedagogyStage,
      archive: archivePedagogyStage,
      get: getPedagogyStage,
      list: (p) => listPedagogyStages({ status: p.status as never, take: p.take, skip: p.skip }),
    },
  },
  lessons: {
    key: "lessons",
    label: "Lições",
    labelSingular: "Lição",
    basePath: "/admin/pedagogy/lessons",
    primaryLabelField: "title",
    hasSlug: false,
    hasStatus: true,
    hasPublish: true,
    supportsStatusFilter: true,
    fields: [{ name: "title", label: "Título", type: "text", required: true }],
    service: {
      create: createLesson,
      update: updateLesson,
      publish: publishLesson,
      archive: archiveLesson,
      get: getLesson,
      list: (p) => listLessons({ status: p.status as never, take: p.take, skip: p.skip }),
    },
  },
};

export function getSimpleEntityConfig(key: string): SimpleEntityConfig {
  const config = SIMPLE_ENTITIES[key];
  if (!config) {
    throw new Error(`"${key}" não é uma entidade administrativa reconhecida.`);
  }
  return config;
}
