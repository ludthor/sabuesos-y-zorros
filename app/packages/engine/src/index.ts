/**
 * Motor de reglas de Sabuesos y Zorros (ADR-0002).
 *
 * Código puro, sin entrada ni salida: recibe un estado y una acción y devuelve
 * el estado nuevo o un error. Cada regla entra con una prueba que cita la
 * sección de docs/reglamento.md que implementa.
 */

export { parseTerritories } from './cards.ts';

export type Side = 'foxes' | 'hounds';
export const SIDES: readonly Side[] = ['foxes', 'hounds'];

/** Una parte del proyecto que se disputa (§6.4). Sale de cartas/cartas.csv. */
export interface Territory {
  id: string;
  name: string;
  /** Pregunta guía. */
  guide: string;
}

export interface TerritoryState extends Territory {
  /** Bando que tiene la ficha grande del territorio, o null si nadie lo ha ganado (§4.3). */
  owner: Side | null;
}

export interface GameState {
  phase: 'setup';
  /** Territorios en juego (§3.4). Hasta C0-02 se juegan los seis (Ariel, C0-03). */
  territories: TerritoryState[];
}

/** Lo que un bando ve de la partida (ADR-0001). Hoy todo es público; las manos llegan en C2. */
export interface BoardView {
  phase: GameState['phase'];
  territories: TerritoryState[];
  /** Territorios ganados por cada bando. */
  score: Record<Side, number>;
}

export function createGame(territories: readonly Territory[]): GameState {
  return { phase: 'setup', territories: territories.map((t) => ({ ...t, owner: null })) };
}

/** Proyección del estado para un bando: solo lo que ese bando puede ver (ADR-0001). */
export function boardFor(state: GameState, _side: Side): BoardView {
  const score: Record<Side, number> = { foxes: 0, hounds: 0 };
  for (const t of state.territories) if (t.owner) score[t.owner]++;
  return {
    phase: state.phase,
    territories: state.territories.map((t) => ({ ...t })),
    score,
  };
}

/** Un dispositivo puede cambiar de bando mientras la partida no ha empezado (Ariel, C0-03). */
export function canChangeSide(state: GameState): boolean {
  return state.phase === 'setup';
}
