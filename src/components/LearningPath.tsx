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
import { Fragment } from "react";
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

/**
 * "Estrada" entre nós consecutivos (pedido do usuário: "eu quero uma
 * estrada ali, tudo bonitinho" — igual ao Duolingo/Angry Birds, não uma
 * invenção exclusiva de nenhum dos dois). Cada posição vira uma coordenada
 * X percentual (mesmos 12%/50%/88% já usados por
 * `.lesson-node-row--left/center/right` em `globals.css` — a estrada
 * PASSA pelo centro exato de cada nó, nunca um valor solto novo).
 */
export const POSITION_X: Record<NodePosition, number> = { left: 12, center: 50, right: 88 };

/**
 * Curva suave (Bézier cúbica) de um nó ao próximo — função PURA, testável
 * sem renderizar nada (`LearningPath.test.ts`). `viewBox` é sempre
 * "0 0 100 100" com `preserveAspectRatio="none"`, então a curva se estica
 * para caber na altura real do espaço entre as duas linhas (definida em
 * CSS, `.lesson-path-connector`) sem precisar medir o DOM em JavaScript.
 */
export function buildConnectorPathD(fromPosition: NodePosition, toPosition: NodePosition): string {
  const x1 = POSITION_X[fromPosition];
  const x2 = POSITION_X[toPosition];
  // Pontos de controle a 1/3 e 2/3 da altura — dá a "serpenteada" de
  // estrada mesmo quando os dois nós estão na mesma posição (reta) ou em
  // posições opostas (curva em S).
  return `M ${x1} 0 C ${x1} 34, ${x2} 66, ${x2} 100`;
}

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

/**
 * Função PURA (não um laço dentro do render): para cada item de `items`,
 * devolve a posição do nó ANTERIOR de onde a estrada deveria vir, ou `null`
 * quando não há estrada antes dele (logo após um rótulo de ÁREA, ou o
 * primeiro nó de todos). Calculado ANTES do JSX, não dentro do `.map()` de
 * renderização — mutar uma variável capturada por um callback executado
 * durante o render é um padrão que a regra `react-hooks/immutability`
 * proíbe (o render precisa continuar determinístico mesmo que o React
 * decida pular/reordenar chamadas do callback no futuro).
 */
function computeConnectorOrigins(items: PathItem[]): Array<NodePosition | null> {
  const origins: Array<NodePosition | null> = [];
  let previousPosition: NodePosition | null = null;
  for (const item of items) {
    if (item.kind === "area-label") {
      previousPosition = null;
      origins.push(null);
      continue;
    }
    if (item.kind === "group-label") {
      // Ao contrário do rótulo de ÁREA (acima), o de grupo (unidade·etapa)
      // não interrompe a estrada — nesta base, a maioria das etapas tem só
      // 1 lição cada, então resetar aqui faria a estrada nunca aparecer
      // (sempre "reiniciando" antes de cada lição única).
      origins.push(null);
      continue;
    }
    origins.push(previousPosition);
    previousPosition = item.position;
  }
  return origins;
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
  const connectorOrigins = computeConnectorOrigins(items);

  return (
    <div className="lesson-path">
      {items.map((item, index) => {
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
        const connectorOrigin = connectorOrigins[index];
        const connector = connectorOrigin ? (
          <PathConnector from={connectorOrigin} to={item.position} />
        ) : null;
        return (
          <Fragment key={item.key}>
            {connector}
            <LessonNode
              lessonId={item.lessonId}
              title={item.title}
              status={item.status}
              position={item.position}
              isCurrent={item.isCurrent}
              character={item.isCurrent ? currentCharacter : undefined}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

/** Trecho de estrada entre dois nós consecutivos — só decorativo (`aria-hidden`), a ordem real de navegação vem só dos links dos nós. */
function PathConnector({ from, to }: { from: NodePosition; to: NodePosition }) {
  return (
    <svg
      className="lesson-path-connector"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={buildConnectorPathD(from, to)}
        fill="none"
        stroke="var(--color-path)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={buildConnectorPathD(from, to)}
        fill="none"
        stroke="var(--color-path-edge)"
        strokeWidth="4"
        strokeDasharray="1 11"
        strokeLinecap="round"
      />
    </svg>
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
