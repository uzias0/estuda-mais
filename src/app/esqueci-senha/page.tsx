export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { RequestPasswordResetForm } from "@/components/auth/RequestPasswordResetForm";

export default async function RequestPasswordResetPage() {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");

  return (
    <AuthShell subtitle="Esqueci minha senha">
      <RequestPasswordResetForm />
    </AuthShell>
  );
}
