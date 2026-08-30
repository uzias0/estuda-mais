export const dynamic = "force-dynamic";
import { SimpleEntityDetailPage } from "@/components/admin/SimpleEntityPages";
import { getSimpleEntityConfig } from "@/config/admin-simple-entities";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimpleEntityDetailPage config={getSimpleEntityConfig("tags")} id={id} />;
}
