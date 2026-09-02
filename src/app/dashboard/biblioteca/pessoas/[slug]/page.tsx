/**
 * Bio de uma pessoa real (fase "Biblioteca de Pessoas") — dado real do
 * Módulo 2 (`AcademicPerson`); `imageUrl` é a arte que o próprio usuário
 * mandou (`public/people/`), nunca gerada aqui. Só PUBLISHED (checa de
 * novo aqui, mesma defesa em profundidade de `biblioteca/[id]/page.tsx`).
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAcademicPersonBySlug } from "@/modules/knowledge/server/services/academicPerson.service";
import { EmptyState } from "@/components/EmptyState";

export default async function PessoaPage({
  params,
}: PageProps<"/dashboard/biblioteca/pessoas/[slug]">) {
  const { slug } = await params;
  const person = await getAcademicPersonBySlug(slug);

  if (!person || person.status !== "PUBLISHED") {
    return (
      <div className="page-container">
        <EmptyState title="Esta pessoa não está disponível." />
      </div>
    );
  }

  const years =
    person.birthDate || person.deathDate
      ? [
          person.birthDate ? new Date(person.birthDate).getFullYear() : "?",
          person.deathDate ? new Date(person.deathDate).getFullYear() : "presente",
        ].join(" – ")
      : null;

  return (
    <div className="page-container stack">
      <Link href="/dashboard/biblioteca/pessoas" className="btn btn-secondary">
        Voltar
      </Link>

      <div className="card stack" style={{ textAlign: "center" }}>
        {person.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.imageUrl}
            alt={person.name}
            width={120}
            height={120}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto",
              border: "4px solid var(--color-brand-bg)",
            }}
          />
        ) : null}
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 8 }}>{person.name}</h1>
        {person.fullName && person.fullName !== person.name ? (
          <p style={{ color: "var(--color-text-muted)" }}>{person.fullName}</p>
        ) : null}
        {years ? <p style={{ color: "var(--color-text-muted)" }}>{years}</p> : null}
        {person.countryContext ? (
          <p style={{ color: "var(--color-text-subtle)", fontSize: "0.85rem" }}>
            {person.countryContext}
          </p>
        ) : null}
      </div>

      {person.bio ? (
        <div className="card">
          <p className="card-title">Biografia</p>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{person.bio}</p>
        </div>
      ) : null}

      {person.works.length > 0 ? (
        <div className="card card--tight">
          <p className="card-title">Obras</p>
          <div className="stack" style={{ marginTop: 8, gap: 6 }}>
            {person.works.map(({ work }) => (
              <p key={work.id}>
                {work.title}
                {work.year ? ` (${work.year})` : ""}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
