export const dynamic = "force-dynamic";
import { SimpleEntityListPage } from "@/components/admin/SimpleEntityPages";
import { getSimpleEntityConfig } from "@/config/admin-simple-entities";

export default function Page() {
  return <SimpleEntityListPage config={getSimpleEntityConfig("developmental-stages")} />;
}
