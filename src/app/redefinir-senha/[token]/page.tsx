export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ params }: PageProps<"/redefinir-senha/[token]">) {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");
  const { token } = await params;

  return (
    <div className="page-container" style={{ paddingTop: "var(--space-7)" }}>
      <div className="stack" style={{ maxWidth: 420, margin: "0 auto var(--space-5)" }}>
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            margin: "0 auto",
            borderRadius: "var(--radius-pill)",
            background: "var(--gradient-brand)",
            boxShadow: "var(--shadow-float)",
            fontSize: "1.6rem",
          }}
        >
          🧠
        </span>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, textAlign: "center" }}>Estuda+</h1>
        <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          Defina sua nova senha
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
