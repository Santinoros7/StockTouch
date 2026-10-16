// Sistema de iconos de alto contraste (placeholder para que el diseñador
// lo reemplace por los definitivos). Todos usan currentColor y trazo grueso.
const TRAZO = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONOS = {
  vasos: (
    <>
      <path d="M17 14h30l-4 40H21z" {...TRAZO} />
      <path d="M14 14h36" {...TRAZO} />
      <path d="M19.5 28h25l-1.6 14H21.1z" fill="currentColor" opacity=".35" />
    </>
  ),
  tapas: (
    <>
      <ellipse cx="32" cy="38" rx="22" ry="8" {...TRAZO} />
      <path d="M14 34c2-8 10-12 18-12s16 4 18 12" {...TRAZO} />
      <path d="M28 22v-5h8v5" {...TRAZO} />
    </>
  ),
  leche: (
    <>
      <path d="M20 24l6-10h12l6 10v30H20z" {...TRAZO} />
      <path d="M20 24h24M26 14v-4h12v4" {...TRAZO} />
      <path d="M26 36c2 3 10 3 12 0" {...TRAZO} />
    </>
  ),
  cafe: (
    <>
      <ellipse cx="32" cy="32" rx="15" ry="21" transform="rotate(30 32 32)" {...TRAZO} />
      <path d="M24 16c10 8 6 24 16 32" {...TRAZO} />
    </>
  ),
  azucar: (
    <>
      <path d="M14 18l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3v28l-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3z" {...TRAZO} />
      <path d="M22 32h20" {...TRAZO} />
    </>
  ),
  servilletas: (
    <>
      <path d="M12 16h40v32H12z" {...TRAZO} />
      <path d="M12 16l40 32M12 48l20-16" {...TRAZO} />
    </>
  ),
  bolsas: (
    <>
      <path d="M14 24h36l-3 30H17z" {...TRAZO} />
      <path d="M24 24v-6a8 8 0 0116 0v6" {...TRAZO} />
    </>
  ),
  medialunas: (
    <>
      <path d="M8 40c6-16 18-24 24-24s18 8 24 24c-6-4-12-4-16 0-3-6-13-6-16 0-4-4-10-4-16 0z" {...TRAZO} />
      <path d="M26 22l4 14M38 22l-4 14" {...TRAZO} />
    </>
  ),
};

const GENERICO = (
  <>
    <path d="M12 22l20-10 20 10v22L32 54 12 44z" {...TRAZO} />
    <path d="M12 22l20 10 20-10M32 32v22" {...TRAZO} />
  </>
);

export default function InsumoIcon({ nombre, size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {ICONOS[nombre] ?? GENERICO}
    </svg>
  );
}
