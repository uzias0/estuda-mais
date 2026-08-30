/**
 * Componentes de página genéricos para as 14 entidades administrativas
 * "simples" (Módulo 12, `src/config/admin-simple-entities.ts`). Server
 * Components assíncronos — cada rota real (`src/app/admin/.../page.tsx`)
 * só importa a config certa e chama uma destas duas funções; nenhuma
 * lógica de negócio vive aqui, só apresentação + formulários que chamam as
 * Server Actions genéricas.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SimpleEntityConfig, SimpleFieldConfig } from "@/config/admin-simple-entities";
import {
  createSimpleEntityAction,
  updateSimpleEntityAction,
  publishSimpleEntityAction,
  archiveSimpleEntityAction,
} from "@/server/actions/admin/simple-entity-actions";
import { Badge, type BadgeTone } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel } from "@/lib/format";

function statusTone(status?: string): BadgeTone {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "muted";
  return "warning";
}

async function FieldInput({
  field,
  defaultValue,
}: {
  field: SimpleFieldConfig;
  defaultValue?: unknown;
}) {
  const id = `field-${field.name}`;
  if (field.type === "textarea") {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          name={field.name}
          className="text-input"
          rows={4}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
        />
        {field.helpText ? (
          <small style={{ color: "var(--color-text-muted)" }}>{field.helpText}</small>
        ) : null}
      </div>
    );
  }
  if (field.type === "select") {
    const options = field.staticOptions ?? (field.loadOptions ? await field.loadOptions() : []);
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}</label>
        <select
          id={id}
          name={field.name}
          className="text-input"
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
        >
          <option value="">— selecione —</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.helpText ? (
          <small style={{ color: "var(--color-text-muted)" }}>{field.helpText}</small>
        ) : null}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      <input
        id={id}
        name={field.name}
        type={field.type === "number" ? "number" : "text"}
        className="text-input"
        required={field.required}
        defaultValue={
          typeof defaultValue === "string" || typeof defaultValue === "number" ? defaultValue : ""
        }
      />
      {field.helpText ? (
        <small style={{ color: "var(--color-text-muted)" }}>{field.helpText}</small>
      ) : null}
    </div>
  );
}

export async function SimpleEntityListPage({ config }: { config: SimpleEntityConfig }) {
  const createAction = createSimpleEntityAction.bind(null, config.key);
  const items = await config.service.list({ take: 100 });

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{config.label}</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Nova {config.labelSingular.toLowerCase()}
        </summary>
        <form action={createAction} className="stack" style={{ marginTop: "var(--space-4)" }}>
          {config.hasSlug ? (
            <div className="field">
              <label htmlFor="field-slug">Slug</label>
              <input
                id="field-slug"
                name="slug"
                type="text"
                className="text-input"
                required
                placeholder="ex.: psicanalise"
              />
              <small style={{ color: "var(--color-text-muted)" }}>
                kebab-case, único, não editável depois de criado.
              </small>
            </div>
          ) : null}
          <div className="form-grid">
            {await Promise.all(
              config.fields.map(async (field) => <FieldInput key={field.name} field={field} />),
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {items.length === 0 ? (
        <EmptyState title={`Nenhuma ${config.labelSingular.toLowerCase()} cadastrada ainda.`} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{config.primaryLabelField === "title" ? "Título" : "Nome"}</th>
                {config.hasSlug ? <th>Slug</th> : null}
                {config.hasStatus ? <th>Status</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={String(item.id)}>
                  <td>
                    <Link href={`${config.basePath}/${item.id}`}>
                      {String(item[config.primaryLabelField] ?? "—")}
                    </Link>
                  </td>
                  {config.hasSlug ? <td>{String(item.slug ?? "—")}</td> : null}
                  {config.hasStatus ? (
                    <td>
                      <Badge tone={statusTone(String(item.status))}>
                        {publicationStatusLabel(String(item.status))}
                      </Badge>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export async function SimpleEntityDetailPage({
  config,
  id,
}: {
  config: SimpleEntityConfig;
  id: string;
}) {
  const item = await config.service.get(id);
  if (!item) notFound();

  const updateAction = updateSimpleEntityAction.bind(null, config.key, id);
  const publishAction = config.service.publish
    ? publishSimpleEntityAction.bind(null, config.key, id)
    : null;
  const archiveAction = config.service.archive
    ? archiveSimpleEntityAction.bind(null, config.key, id)
    : null;

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {String(item[config.primaryLabelField] ?? config.labelSingular)}
        </h1>
        {config.hasStatus ? (
          <Badge tone={statusTone(String(item.status))}>
            {publicationStatusLabel(String(item.status))}
          </Badge>
        ) : null}
      </div>
      {config.hasSlug ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          slug: {String(item.slug)}
        </p>
      ) : null}

      <form action={updateAction} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          {await Promise.all(
            config.fields.map(async (field) => (
              <FieldInput key={field.name} field={field} defaultValue={item[field.name] as never} />
            )),
          )}
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar alterações
        </button>
      </form>

      {publishAction || archiveAction ? (
        <div className="card stack">
          <p className="card-title">Publicação</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            A publicação passa pelo serviço de domínio — este formulário não define{" "}
            <code>status</code> diretamente; se houver exigência de procedência (fonte/citação), a
            operação é recusada pelo servidor.
          </p>
          <div className="admin-actions-row">
            {publishAction && item.status !== "PUBLISHED" ? (
              <form action={publishAction}>
                <button type="submit" className="btn btn-primary">
                  Publicar
                </button>
              </form>
            ) : null}
            {archiveAction && item.status !== "ARCHIVED" ? (
              <form action={archiveAction}>
                <button type="submit" className="btn btn-secondary">
                  Arquivar
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
