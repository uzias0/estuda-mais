"use client";

/**
 * Fluxo de entrada ANÔNIMO (fase "diagnóstico antes do cadastro" — pedido
 * do usuário: "a primeira cara que a pessoa tem que ter no site é... um
 * olá, tudo bem, deu umas boas-vindas, aí começa, vamos fazer uma
 * trilha... o personagem vai estar auxiliando ela"). Ordem: Boas-vindas →
 * Tutorial (o que são os selos do topo) → Diagnóstico (reaproveita
 * `DiagnosticRunner`, com as Server Actions ANÔNIMAS) → resultado (rota
 * separada, `/comecar/resultado`, que já termina com o CTA de cadastro).
 *
 * Personagem "se mexendo": cada fase troca a expressão/mensagem do
 * `CharacterMessage` (mesmo componente usado em toda lição/diagnóstico),
 * nunca uma imagem estática solta.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { DiagnosticRunner } from "./DiagnosticRunner";
import { CharacterMessage } from "./characters/CharacterMessage";
import { NEUTRAL_CHARACTER } from "@/config/characters";
import {
  startAnonymousDiagnosticAction,
  submitAnonymousDiagnosticAnswerAction,
  finishAnonymousDiagnosticAction,
} from "@/server/actions/anonymous-diagnostic-actions";

type Phase = "welcome" | "tutorial" | "diagnostic";

const TUTORIAL_ITEMS = [
  { icon: "🔥", title: "Sequência", text: "Quantos dias seguidos você estuda sem parar." },
  { icon: "⭐", title: "XP", text: "Pontos de experiência — sobe de nível conforme você estuda." },
  {
    icon: "❤️",
    title: "Baterias",
    text: "Sua energia pra responder questões — erra, gasta; recarrega sozinha com o tempo.",
  },
  {
    icon: "💎",
    title: "Joias",
    text: "Sua moeda — ganha completando lições e missões, usa pra recarregar bateria.",
  },
];

const ANONYMOUS_ACTIONS = {
  start: startAnonymousDiagnosticAction,
  submitAnswer: submitAnonymousDiagnosticAnswerAction,
  finish: finishAnonymousDiagnosticAction,
};

export function ComecarFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("welcome");

  if (phase === "diagnostic") {
    return (
      <DiagnosticRunner
        actions={ANONYMOUS_ACTIONS}
        onFinished={(sessionId) => router.push(`/comecar/resultado?sessionId=${sessionId}`)}
      />
    );
  }

  if (phase === "tutorial") {
    return (
      <div className="stack">
        <CharacterMessage
          character={NEUTRAL_CHARACTER}
          expression="encouraging"
          message="Antes de começar, uma explicação rápida do que você vai ver por aí:"
        />
        <div className="grid-cards">
          {TUTORIAL_ITEMS.map((item) => (
            <div key={item.title} className="card card--tight">
              <p style={{ fontSize: "1.6rem" }}>{item.icon}</p>
              <p style={{ fontWeight: 700, marginTop: 6 }}>{item.title}</p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setPhase("diagnostic")}
        >
          Entendi, vamos lá!
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <CharacterMessage
        character={NEUTRAL_CHARACTER}
        expression="happy"
        message="Olá! Eu sou a Mente, vou te acompanhar por aqui. Tudo bem?"
      />
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.4rem", fontWeight: 800 }}>Vamos descobrir seu nível?</p>
        <p style={{ color: "var(--color-text-muted)", marginTop: 12 }}>
          Antes de qualquer cadastro, vamos fazer uma mini avaliação — 100% grátis, leva poucos
          minutos, e no fim você já sabe exatamente por onde começar a estudar Psicologia.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20, minWidth: 220 }}
          onClick={() => setPhase("tutorial")}
        >
          Vamos começar
        </button>
      </div>
      <p className="auth-links">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </div>
  );
}
