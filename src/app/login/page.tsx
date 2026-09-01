export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <AuthShell
      subtitle="Entrar na sua conta"
      banner={
        sp.redefinida === "1" ? (
          <p role="status" className="card" style={{ textAlign: "center" }}>
            Senha redefinida com sucesso. Entre com a nova senha.
          </p>
        ) : null
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
