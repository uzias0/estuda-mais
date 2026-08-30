/**
 * Formulário administrativo de questão (Módulo 12) — cobre os 8 tipos do
 * Módulo 3 com linhas fixas de opções/pares (sem JS de cliente, mesma
 * filosofia de formulário puro do Módulo 11). Não valida nada aqui: monta
 * o que o usuário digitou e deixa `assertQuestionShapeValid` (servidor)
 * aceitar ou recusar — inclusive o próprio `type` só é escolhível na
 * CRIAÇÃO (o schema não permite alterar `type` depois, ver
 * `question.service.ts`).
 */
import { difficultyLabel, questionTypeLabel } from "@/lib/format";

const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MULTI_SELECT",
  "ORDERING",
  "MATCHING",
  "FILL_BLANK",
  "SHORT_ANSWER",
  "CASE_STUDY",
];
const DIFFICULTIES = ["INICIANTE", "BASICO", "INTERMEDIARIO", "AVANCADO", "DOMINIO"];
const OPTION_TYPES = new Set([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MULTI_SELECT",
  "ORDERING",
  "CASE_STUDY",
]);

export interface QuestionFormExisting {
  prompt: string;
  type: string;
  explanation: string | null;
  difficulty: string;
  sourceId: string;
  examEditionId: string | null;
  reproductionAllowed: boolean;
  options: { text: string; isCorrect: boolean; order: number }[];
}

export function QuestionForm({
  action,
  sources,
  examEditions,
  existing,
  lockType,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => any;
  sources: { id: string; name: string }[];
  examEditions: { id: string; name: string }[];
  existing?: QuestionFormExisting;
  lockType?: boolean;
}) {
  const type = existing?.type ?? "MULTIPLE_CHOICE";

  return (
    <form action={action} className="card stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="type">Tipo</label>
          {lockType ? (
            <>
              <input type="hidden" name="type" value={type} />
              <input className="text-input" value={questionTypeLabel(type)} disabled readOnly />
            </>
          ) : (
            <select id="type" name="type" className="text-input" defaultValue={type} required>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {questionTypeLabel(t)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="field">
          <label htmlFor="difficulty">Dificuldade</label>
          <select
            id="difficulty"
            name="difficulty"
            className="text-input"
            defaultValue={existing?.difficulty ?? ""}
            required
          >
            <option value="" disabled>
              — selecione —
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sourceId">Fonte (procedência)</label>
          <select
            id="sourceId"
            name="sourceId"
            className="text-input"
            defaultValue={existing?.sourceId ?? ""}
            required
          >
            <option value="" disabled>
              — selecione —
            </option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="examEditionId">Edição de prova (opcional)</label>
          <select
            id="examEditionId"
            name="examEditionId"
            className="text-input"
            defaultValue={existing?.examEditionId ?? ""}
          >
            <option value="">— questão autoral (sem prova) —</option>
            {examEditions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field field--full">
        <label htmlFor="prompt">Enunciado</label>
        <textarea
          id="prompt"
          name="prompt"
          className="text-input"
          rows={3}
          defaultValue={existing?.prompt ?? ""}
          required
        />
      </div>
      <div className="field field--full">
        <label htmlFor="explanation">Explicação (mostrada após responder)</label>
        <textarea
          id="explanation"
          name="explanation"
          className="text-input"
          rows={2}
          defaultValue={existing?.explanation ?? ""}
        />
      </div>
      <label className="option-row" style={{ maxWidth: 320 }}>
        <input
          type="checkbox"
          name="reproductionAllowed"
          defaultChecked={existing?.reproductionAllowed ?? true}
        />
        <span>Reprodução do enunciado permitida</span>
      </label>

      {OPTION_TYPES.has(type) ? (
        <div className="stack">
          <p className="card-title">
            {type === "ORDERING"
              ? "Itens (a ordem digitada é a sequência correta)"
              : "Alternativas"}
          </p>
          {Array.from({ length: 8 }).map((_, i) => {
            const opt = existing?.options[i];
            return (
              <div key={i} className="row-wrap" style={{ alignItems: "center" }}>
                <input
                  name={`option_text_${i}`}
                  className="text-input"
                  placeholder={`Alternativa ${i + 1}`}
                  defaultValue={opt?.text ?? ""}
                  style={{ flex: 1 }}
                />
                {type !== "ORDERING" ? (
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
                  >
                    <input
                      type="checkbox"
                      name={`option_correct_${i}`}
                      defaultChecked={opt?.isCorrect ?? false}
                    />
                    correta
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {type === "MATCHING" ? (
        <div className="stack">
          <p className="card-title">Pares (esquerda ↔ direita)</p>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="row-wrap">
              <input
                name={`pair_left_${i}`}
                className="text-input"
                placeholder="Esquerda"
                style={{ flex: 1 }}
              />
              <input
                name={`pair_right_${i}`}
                className="text-input"
                placeholder="Direita"
                style={{ flex: 1 }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {type === "FILL_BLANK" || type === "SHORT_ANSWER" ? (
        <div className="field field--full">
          <label htmlFor="accepted_answers">Respostas aceitas (uma por linha)</label>
          <textarea id="accepted_answers" name="accepted_answers" className="text-input" rows={3} />
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
        {existing ? "Salvar alterações" : "Criar questão"}
      </button>
    </form>
  );
}
