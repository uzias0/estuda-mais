/**
 * Base de Conhecimento: Pessoas (fase "Biblioteca de Pessoas" — pedido do
 * usuário: "eu vou fazer, pra você, uma imagem de cada um pra você usar")
 * — lista todas as `AcademicPerson` PUBLICADAS (Módulo 2), com a
 * ilustração real que o usuário mandou quando existir
 * (`AcademicPerson.imageUrl`, `public/people/`). Sem foto cadastrada,
 * mostra só as iniciais — nunca inventa uma imagem.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAcademicPersons } from "@/modules/knowledge/server/services/academicPerson.service";
import { EmptyState } from "@/components/EmptyState";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PessoasPage() {
  const people = await listAcademicPersons({ status: "PUBLISHED", take: 100 });

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Pessoas</h1>
        <Link href="/dashboard/biblioteca" className="btn btn-secondary">
          Voltar à Biblioteca
        </Link>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>
        Pensadores e pesquisadores reais por trás das teorias que você estuda.
      </p>

      {people.length === 0 ? (
        <EmptyState title="Nenhuma pessoa publicada ainda." />
      ) : (
        <div className="grid-cards">
          {people.map((person) => (
            <Link
              key={person.id}
              href={`/dashboard/biblioteca/pessoas/${person.slug}`}
              className="card card--tight"
              style={{ textAlign: "center" }}
            >
              {person.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.imageUrl}
                  alt={person.name}
                  width={72}
                  height={72}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    objectFit: "cover",
                    margin: "0 auto",
                    border: "3px solid var(--color-brand-bg)",
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--color-brand-bg)",
                    color: "var(--color-brand-strong)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                  }}
                >
                  {initials(person.name)}
                </div>
              )}
              <p style={{ marginTop: 10, fontWeight: 700 }}>{person.name}</p>
              {person.birthDate ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 2 }}>
                  {new Date(person.birthDate).getFullYear()}
                  {person.deathDate ? ` – ${new Date(person.deathDate).getFullYear()}` : ""}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
