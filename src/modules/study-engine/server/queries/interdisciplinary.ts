/**
 * Conexões interdisciplinares REAIS (Módulo 10, seção 15) — "somente quando
 * houver relacionamento acadêmico real no banco". Reaproveita
 * `listRelationsForEntity` (Módulo 2, `academicRelation.service.ts`) sobre
 * `AcademicRelation` (o grafo genérico já existente) — nenhuma associação
 * artificial "porque os assuntos parecem relacionados" é criada aqui; se
 * não houver uma `AcademicRelation` PUBLICADA ligando o conceito a outra
 * disciplina/conceito, não há conexão interdisciplinar para aquele
 * conceito, ponto final.
 */
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { listRelationsForEntity } from "@/modules/knowledge/server/services/academicRelation.service";

type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];

export interface InterdisciplinaryConnection {
  relationType: string;
  entityType: KnowledgeEntityTypeValue;
  entityId: string;
}

/**
 * Só relações PUBLICADAS contam (rascunho de curadoria não é evidência
 * suficiente para orientar uma recomendação ao aluno) e só quando o outro
 * lado é `CONCEPT` ou `DISCIPLINE` — os dois tipos de nó que
 * `getComplementaryContentForConcept`/`listLibraryByDiscipline`/
 * `getCurrentAffairsByDiscipline` (Módulo 7) sabem consultar diretamente.
 */
export async function findInterdisciplinaryConnections(
  conceptId: string,
): Promise<InterdisciplinaryConnection[]> {
  const relations = await listRelationsForEntity(KnowledgeEntityType.CONCEPT, conceptId);

  const connections: InterdisciplinaryConnection[] = [];
  for (const relation of relations) {
    if (relation.status !== PublicationStatus.PUBLISHED) continue;

    const isSource =
      relation.sourceType === KnowledgeEntityType.CONCEPT && relation.sourceId === conceptId;
    const otherType = isSource ? relation.targetType : relation.sourceType;
    const otherId = isSource ? relation.targetId : relation.sourceId;
    if (otherType !== KnowledgeEntityType.CONCEPT && otherType !== KnowledgeEntityType.DISCIPLINE) {
      continue;
    }
    connections.push({
      relationType: relation.relationType,
      entityType: otherType,
      entityId: otherId,
    });
  }
  return connections;
}
