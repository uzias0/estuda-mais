/**
 * Variante "maskable" (com margem de segurança) do ícone 512×512 — o SO
 * pode recortar em círculo/squircle; sem essa margem, o 🧠 ficaria cortado
 * em lançadores que aplicam máscara (Android adaptive icons).
 */
import { renderAppIcon } from "@/lib/app-icon";

export function GET() {
  return renderAppIcon(512, { padding: 96 });
}
