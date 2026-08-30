export const dynamic = "force-dynamic";
import { listAuditLogEntries } from "@/modules/curation/server/services/auditLog";
import { EmptyState } from "@/components/EmptyState";
import { auditActionLabel, formatDateTime } from "@/lib/format";

const ENTITY_TYPES = [
  "PERSON",
  "WORK",
  "THEORY",
  "CONCEPT",
  "SCHOOL",
  "DISCIPLINE",
  "QUESTION",
  "LESSON",
  "EXAM_EDITION",
  "ACADEMIC_RELATION",
  "LEGAL_REFERENCE",
  "SOURCE",
  "TRACK",
  "LEARNING_AREA",
  "UNIT",
  "STAGE",
  "PERIOD",
  "DEVELOPMENTAL_STAGE",
  "TAG",
  "EXAM",
  "EXAM_BOARD",
  "ORGANIZATION",
  "POSITION",
  "SIMULATION",
  "LIBRARY_ITEM",
  "CURRENT_AFFAIR",
];
const ACTIONS = ["CREATE", "UPDATE", "PUBLISH", "ARCHIVE", "RESTORE", "LINK", "UNLINK"];

/**
 * Visualizador de auditoria (Módulo 12, seção 12/16) — `listAuditLogEntries`
 * é a única consulta nova aqui (a escrita, `recordAudit`, já existe desde o
 * Módulo 1/2); esta página só lê e filtra o que os serviços de domínio já
 * gravam a cada CREATE/UPDATE/PUBLISH/ARCHIVE/RESTORE/LINK/UNLINK.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const entries = await listAuditLogEntries({
    entityType: (sp.entityType as never) || undefined,
    entityId: sp.entityId || undefined,
    action: (sp.action as never) || undefined,
    take: 100,
  });

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Auditoria</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Toda mutação de curadoria já é registrada em <code>ContentAuditLog</code> pelos serviços de
        domínio (Módulos 2–9) — esta tela só lê e filtra esse histórico.
      </p>

      <form method="GET" className="admin-toolbar card">
        <div className="field">
          <label htmlFor="entityType">Tipo de entidade</label>
          <select
            id="entityType"
            name="entityType"
            className="text-input"
            defaultValue={sp.entityType ?? ""}
          >
            <option value="">Todos</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="entityId">ID da entidade</label>
          <input
            id="entityId"
            name="entityId"
            className="text-input"
            defaultValue={sp.entityId ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="action">Ação</label>
          <select id="action" name="action" className="text-input" defaultValue={sp.action ?? ""}>
            <option value="">Todas</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {auditActionLabel(a)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Filtrar
        </button>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="Nenhuma entrada de auditoria encontrada." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Ator</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{auditActionLabel(entry.action)}</td>
                  <td>
                    {entry.entityType}: {entry.entityId}
                  </td>
                  <td>{entry.actor.profile?.name ?? entry.actor.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
