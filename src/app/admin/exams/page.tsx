export const dynamic = "force-dynamic";
import Link from "next/link";
import { SimpleEntityListPage } from "@/components/admin/SimpleEntityPages";
import { getSimpleEntityConfig } from "@/config/admin-simple-entities";

export default function Page() {
  return (
    <div className="stack">
      <div className="page-container">
        <div className="row-wrap">
          <Link href="/admin/exams/editions" className="btn btn-secondary">
            Edições de prova
          </Link>
          <Link href="/admin/exams/boards" className="btn btn-secondary">
            Bancas
          </Link>
          <Link href="/admin/exams/organizations" className="btn btn-secondary">
            Órgãos/organizações
          </Link>
          <Link href="/admin/exams/positions" className="btn btn-secondary">
            Cargos
          </Link>
        </div>
      </div>
      <SimpleEntityListPage config={getSimpleEntityConfig("exams")} />
    </div>
  );
}
