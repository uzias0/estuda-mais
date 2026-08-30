/**
 * Ícone 192×192 referenciado por `manifest.ts` (`purpose: "any"`) — não é
 * o favicon (`app/icon.tsx`, convenção do Next para `<head>`); este é uma
 * rota própria porque o Web App Manifest precisa de tamanhos específicos
 * que a convenção de favicon único não cobre.
 */
import { renderAppIcon } from "@/lib/app-icon";

export function GET() {
  return renderAppIcon(192);
}
