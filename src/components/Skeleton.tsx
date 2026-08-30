/** Placeholder de carregamento (Módulo 11, seção 39) — usado nos `loading.tsx` de cada rota. */
export function Skeleton({
  height = 16,
  width = "100%",
}: {
  height?: number;
  width?: string | number;
}) {
  return <div className="skeleton" style={{ height, width }} />;
}

export function SkeletonCard() {
  return (
    <div className="card stack" aria-hidden="true">
      <Skeleton height={14} width="40%" />
      <Skeleton height={22} width="70%" />
      <Skeleton height={10} width="100%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="stack" role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="visually-hidden">Carregando conteúdo…</span>
    </div>
  );
}
