import type { Side } from '@syz/engine';

/**
 * Siluetas geométricas del kit imprimible (herramientas/generar_cartas.py, SABUESO y ZORRO),
 * en un lienzo de 0 a 100. Si cambian allí, hay que cambiarlas aquí.
 */
const POLYGONS: Record<Side, Array<[string, string]>> = {
  hounds: [
    ['66,74 76,58 78,40 92,96 64,96', '#3555E3'],
    ['30,28 40,18 70,22 78,40 60,48 38,40', '#2747D6'],
    ['30,28 38,40 34,52 12,50 8,40 14,32', '#4A68F0'],
    ['12,50 34,52 30,60 17,58', '#1C35A8'],
    ['56,26 72,30 76,58 66,74 56,62 52,40', '#13277D'],
    ['6,37 13,35 14,43 7,45', '#141414'],
    ['39,29 46,28 44,33', '#FFF4E6'],
  ],
  foxes: [
    ['18,10 38,38 22,44', '#FF8A50'],
    ['82,10 62,38 78,44', '#E2531A'],
    ['22,17 33,36 25,40', '#141414'],
    ['78,17 67,36 75,40', '#141414'],
    ['22,44 38,38 50,46 50,62 30,58', '#FF7A3D'],
    ['78,44 62,38 50,46 50,62 70,58', '#F0601F'],
    ['22,44 30,58 50,88 14,56', '#FFFFFF'],
    ['78,44 70,58 50,88 86,56', '#F2DFC6'],
    ['30,58 50,62 50,88', '#FFE9D2'],
    ['70,58 50,62 50,88', '#EBD3B5'],
    ['46,83 54,83 50,89', '#141414'],
    ['33,50 41,52 34,55', '#141414'],
    ['67,50 59,52 66,55', '#141414'],
  ],
};

const LABELS: Record<Side, string> = { hounds: 'Sabueso', foxes: 'Zorro' };

/** El animal de un bando. Sin `labelled`, es decorativo y lo acompaña un texto. */
export function Animal({ side, labelled = false, className }: { side: Side; labelled?: boolean; className?: string }) {
  const a11y = labelled ? { role: 'img', 'aria-label': LABELS[side] } : { 'aria-hidden': true as const };
  return (
    <svg viewBox="0 0 100 100" className={className} {...a11y}>
      {POLYGONS[side].map(([points, fill]) => (
        <polygon key={points} points={points} fill={fill} />
      ))}
    </svg>
  );
}
