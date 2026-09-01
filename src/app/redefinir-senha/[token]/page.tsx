export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ params }: PageProps<"/redefinir-senha/[token]">) {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");
  const { token } = await params;

  return (
    <AuthShell subtitle="Defina sua nova senha">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
