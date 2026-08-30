/**
 * Caminho de aprendizagem (fase de redesign visual, seção 9) — substitui a
 * árvore Trilha→Área→Unidade→Etapa→Lição em lista aninhada por um caminho
 * visual de nós. Puramente apresentacional: recebe a MESMA estrutura que
 * `getFullTrack` (Módulo 4) já devolve e o MESMO mapa de disponibilidade de
 * `getTrackLessonAvailability` (Módulo 8, `LessonAvailabilityStatus`) — não
 * decide nada, só interpreta visualmente o que os serviços já calcularam.
 * Nenhum estado de negócio novo; `LOCKED` nunca vira link (mesma regra que
 * a lista antiga já aplicava).
 *
 * `buildPathItems` é uma função PURA (achata a árvore num array antes de
 * renderizar, em vez de mutar uma variável durante o JSX) — isso também
 * deixa o posicionamento esquerda/centro/direita testável isoladamente,
 * sem precisar renderizar nada (`LearningPath.test.ts`).
 */
import Link from "next/link";
import { Play, Lock, Check, Star, Compass } from "lucide-react";
import { CharacterAvatar } from "./characters/CharacterAvatar";
import type { CharacterDef } from "@/config/characters";

export type LessonAvailabilityStatus = "LOCKED" | "AVAILABLE" | "COMPLETED" | "MASTERED";

const STATUS_ICON: Record<LessonAvailabilityStatus, typeof Play> = {
  AVAILABLE: Play,
  LOCKED: Lock,
  COMPLETED: Check,
  MASTERED: Star,
};

const STATUS_MODIFIER: Record<LessonAvailabilityStatus, string> = {
  AVAILABLE: "lesson-node--available",
  LOCKED: "lesson-node--locked",
  COMPLETED: "lesson-node--completed",
  MASTERED: "lesson-node--mastered",
};

export const NODE_POSITIONS = ["center", "left", "right"] as const;
export type NodePosition = (typeof NODE_POSITIONS)[number];

export interface LearningPathData {
  areas: Array<{
    area: {
      id: string;
      name: string;
      units: Array<{
        unit: {
          id: string;
          name: string;
          stages: Array<{
            stage: {
              id: string;
              name: string;
              lessons: Array<{ lesson: { id: string; title: string } }>;
            };
          }>;
        };
      }>;
    };
  }>;
}

export type PathItem =
  | { kind: "area-label"; key: string; label: string }
  | { kind: "group-label"; key: string; label: string }
  | {
      kind: "lesson";
      key: string;
      lessonId: string;
      title: string;
      status: LessonAvailabilityStatus;
      position: NodePosition;
      /** Primeira lição AVAILABLE encontrada na sequência — "onde o aluno
       * está agora" (seção 6 do prompt: "atual: destaque maior"). Só uma
       * marcação visual; não é um status novo de negócio. */
      isCurrent: boolean;
    };

/** Achata Trilha→Área→Unidade→Etapa→Lição num array plano, já com a posição
 * (esquerda/centro/direita) de cada nó calculada em ordem contínua — a
 * mesma sequência estrutural que `getTrackLessonAvailability` usa. */
export function buildPathItems(
  data: LearningPathData,
  statusByLessonId: Map<string, { status: LessonAvailabilityStatus }>,
): PathItem[] {
  const items: PathItem[] = [];
  let lessonCount = 0;
  let currentAssigned = false;

  for (const { area } of data.areas) {
    items.push({ kind: "area-label", key: `area-${area.id}`, label: area.name });
    for (const { unit } of area.units) {
      for (const { stage } of unit.stages) {
        items.push({
          kind: "group-label",
          key: `group-${stage.id}`,
          label: `${unit.name} · ${stage.name}`,
        });
        for (const { lesson } of stage.lessons) {
          const status = statusByLessonId.get(lesson.id)?.status ?? "LOCKED";
          const isCurrent = !currentAssigned && status === "AVAILABLE";
          if (isCurrent) currentAssigned = true;
          items.push({
            kind: "lesson",
            key: `lesson-${lesson.id}`,
            lessonId: lesson.id,
            title: lesson.title,
            status,
            position: NODE_POSITIONS[lessonCount % NODE_POSITIONS.length],
            isCurrent,
          });
          lessonCount += 1;
        }
      }
    }
  }

  return items;
}

export function LearningPath({
  data,
  statusByLessonId,
  currentCharacter,
}: {
  data: LearningPathData;
  statusByLessonId: Map<string, { status: LessonAvailabilityStatus }>;
  /** Personagem a mostrar "apontando" para a lição atual (opcional — resolvido
   * pela página via `resolveCharacterForLesson`, nenhuma lógica nova aqui). */
  currentCharacter?: CharacterDef;
}) {
  const items = buildPathItems(data, statusByLessonId);

  return (
    <div className="lesson-path">
      {items.map((item) => {
        if (item.kind === "area-label") {
          return (
            <p key={item.key} className="lesson-path-group-label">
              <Compass aria-hidden="true" size={14} strokeWidth={2.5} /> {item.label}
            </p>
          );
        }
        if (item.kind === "group-label") {
          return (
            <p
              key={item.key}
              className="lesson-path-group-label"
              style={{ background: "transparent", fontSize: "0.72rem" }}
            >
              {item.label}
            </p>
          );
        }
        return (
          <LessonNode
            key={item.key}
            lessonId={item.lessonId}
            title={item.title}
            status={item.status}
            position={item.position}
            isCurrent={item.isCurrent}
            character={item.isCurrent ? currentCharacter : undefined}
          />
        );
      })}
    </div>
  );
}

function LessonNode({
  lessonId,
  title,
  status,
  position,
  isCurrent,
  character,
}: {
  lessonId: string;
  title: string;
  status: LessonAvailabilityStatus;
  position: NodePosition;
  isCurrent: boolean;
  character?: CharacterDef;
}) {
  const locked = status === "LOCKED";
  const StatusIcon = STATUS_ICON[status];
  const content = (
    <>
      <span className="lesson-node-circle" aria-hidden="true">
        <StatusIcon size={26} strokeWidth={2.5} />
      </span>
      <span className="lesson-node-label">{title}</span>
    </>
  );

  return (
    <div className={`lesson-node-row lesson-node-row--${position}`}>
      {character ? (
        <div className="lesson-node-pointer" aria-hidden="true">
          <CharacterAvatar character={character} expression="pointing" size="sm" />
        </div>
      ) : null}
      {locked ? (
        <span
          className={`lesson-node ${STATUS_MODIFIER[status]}`}
          aria-disabled="true"
          aria-label={`${title} — bloqueada`}
        >
          {content}
        </span>
      ) : (
        <Link
          href={`/dashboard/licoes/${lessonId}`}
          className={`lesson-node ${STATUS_MODIFIER[status]}${isCurrent ? " lesson-node--current" : ""}`}
          aria-label={`${title} — ${statusLabel(status)}${isCurrent ? " (lição atual)" : ""}`}
        >
          {content}
        </Link>
      )}
    </div>
  );
}

function statusLabel(status: LessonAvailabilityStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "disponível";
    case "COMPLETED":
      return "concluída";
    case "MASTERED":
      return "dominada";
    default:
      return "bloqueada";
  }
}
