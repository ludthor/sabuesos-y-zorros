import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTerritories, type Territory } from '@syz/engine';

/** La fuente de verdad de las cartas (CLAUDE.md): la app no copia sus textos a mano. */
export const CARDS_CSV = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../cartas/cartas.csv');

export function loadTerritories(path = CARDS_CSV): Territory[] {
  const territories = parseTerritories(readFileSync(path, 'utf8'));
  if (territories.length === 0) throw new Error(`No hay territorios en ${path}`);
  return territories;
}
