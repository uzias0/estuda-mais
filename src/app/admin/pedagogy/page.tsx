export const dynamic = "force-dynamic";
import Link from "next/link";
import { listTracks } from "@/modules/pedagogy/server/services/track.service";
import { createTrackAction } from "@/server/actions/admin/pedagogy-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel } from "@/lib/format";

const MODES = ["FORMACAO", "FACULDADE", "VESTIBULAR", "CONCURSO", "REVISAO", "DESAFIO", "SIMULADO"];

export default async function PedagogyHubPage() {
  const tracks = await listTracks({ take: 100 });

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Trilhas e Lições</h1>
      <div className="row-wrap">
        <Link href="/admin/pedagogy/areas" className="btn btn-secondary">
          Áreas
        </Link>
        <Link href="/admin/pedagogy/units" className="btn btn-secondary">
          Unidades
        </Link>
        <Link href="/admin/pedagogy/stages" className="btn btn-secondary">
          Etapas
        </Link>
        <Link href="/admin/pedagogy/lessons" className="btn btn-secondary">
          Lições
        </Link>
      </div>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova trilha</summary>
        <form action={createTrackAction} className="stack" style={{ marginTop: "var(--space-4)" }}>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              className="text-input"
              required
              placeholder="ex.: formacao-psicologia"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="mode">Modo</label>
              <select id="mode" name="mode" className="text-input" required>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {tracks.length === 0 ? (
        <EmptyState title="Nenhuma trilha cadastrada ainda." />
      ) : (
        <div className="grid-cards">
          {tracks.map((t) => (
            <Link key={t.id} href={`/admin/pedagogy/tracks/${t.id}`} className="card card--tight">
              <p style={{ fontWeight: 700 }}>{t.name}</p>
              <Badge
                tone={
                  t.status === "PUBLISHED"
                    ? "success"
                    : t.status === "ARCHIVED"
                      ? "muted"
                      : "warning"
                }
              >
                {publicationStatusLabel(t.status)}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
