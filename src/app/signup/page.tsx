export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage() {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");

  return (
    <AuthShell subtitle="Criar sua conta para começar a estudar Psicologia">
      <SignUpForm />
    </AuthShell>
  );
}
