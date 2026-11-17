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

/**
 * - `setup`: el tribunal elige cuántos territorios se juegan y cuáles (§3.4).
 * - `opening`: los zorros eligen por cuál se empieza (§3.4).
 * - `playing`: hay un territorio en disputa (§4.3).
 */
export type Phase = 'setup' | 'opening' | 'playing';

export interface GameState {
  phase: Phase;
  /** Los territorios que se pueden jugar: los seis del §6.4, en su orden. */
  catalog: Territory[];
  /** Cuántos territorios se juegan (§7), entre 3 y 6. */
  territoryCount: number;
  /** Territorios en juego, en el orden del catálogo. Hasta que el tribunal elija, los seis (Ariel, C0-03). */
  territories: TerritoryState[];
  /** Territorio en disputa. */
  current: string | null;
}

/** Lo que un bando ve de la partida (ADR-0001). Hoy todo es público; las manos llegan en C2. */
export interface BoardView extends GameState {
  /** Territorios ganados por cada bando. */
  score: Record<Side, number>;
}

export const MIN_TERRITORIES = 3;
export const MAX_TERRITORIES = 6;

export function createGame(territories: readonly Territory[]): GameState {
  return {
    phase: 'setup',
    catalog: territories.map((t) => ({ ...t })),
    territoryCount: territories.length,
    territories: territories.map((t) => ({ ...t, owner: null })),
    current: null,
  };
}

/** Proyección del estado para un bando: solo lo que ese bando puede ver (ADR-0001). */
export function boardFor(state: GameState, _side: Side): BoardView {
  const score: Record<Side, number> = { foxes: 0, hounds: 0 };
  for (const t of state.territories) if (t.owner) score[t.owner]++;
  return { ...structuredClone(state), score };
}

/** Un dispositivo puede cambiar de bando mientras la partida no ha empezado (Ariel, C0-03). */
export function canChangeSide(state: Pick<GameState, 'phase'>): boolean {
  return state.phase === 'setup';
}

/**
 * Territorios que se sugieren según el tiempo de preguntas (§7). Cada tramo
 * incluye su límite superior: con 20, 30 o 40 minutos, el tramo menor (Ariel, C0-02).
 */
export function suggestedTerritoryCount(minutes: number): number {
  if (minutes <= 20) return 3;
  if (minutes <= 30) return 4;
  if (minutes <= 40) return 5;
  return 6;
}

export type GameAction =
  | { type: 'set_territory_count'; count: number }
  | { type: 'set_territory'; id: string; inPlay: boolean }
  | { type: 'start_game' }
  | { type: 'choose_first_territory'; id: string };

export type RuleError =
  /** Ese bando no puede hacer esa acción. */
  | 'not_allowed'
  /** No es el momento de la partida para esa acción. */
  | 'wrong_phase'
  | 'invalid_count'
  | 'unknown_territory'
  /** Los territorios marcados no coinciden con el número elegido. */
  | 'count_mismatch'
  /** No hay ningún dispositivo de los zorros para elegir el primer territorio. */
  | 'foxes_missing';

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: RuleError };

/** Lo que el motor necesita saber de la sala y no forma parte de la partida. */
export interface ActionContext {
  foxesPresent: boolean;
}

const reject = (error: RuleError): ActionResult => ({ ok: false, error });
const accept = (state: GameState): ActionResult => ({ ok: true, state });

/** Aplica la acción de un bando. Nunca modifica el estado que recibe. */
export function applyAction(state: GameState, side: Side, action: GameAction, ctx: ActionContext): ActionResult {
  switch (action.type) {
    case 'set_territory_count':
    case 'set_territory':
    case 'start_game':
      // «El tribunal decide cuántos según el tiempo disponible y cuáles» (§3.4).
      if (side !== 'hounds') return reject('not_allowed');
      if (state.phase !== 'setup') return reject('wrong_phase');
      return setupAction(state, action, ctx);
    case 'choose_first_territory': {
      // «Los zorros eligen por cuál se empieza» (§3.4).
      if (side !== 'foxes') return reject('not_allowed');
      if (state.phase !== 'opening') return reject('wrong_phase');
      if (!state.territories.some((t) => t.id === action.id)) return reject('unknown_territory');
      return accept({ ...structuredClone(state), phase: 'playing', current: action.id });
    }
  }
}

function setupAction(
  state: GameState,
  action: Exclude<GameAction, { type: 'choose_first_territory' }>,
  ctx: ActionContext,
): ActionResult {
  switch (action.type) {
    case 'set_territory_count': {
      const { count } = action;
      if (!Number.isInteger(count) || count < MIN_TERRITORIES || count > MAX_TERRITORIES) {
        return reject('invalid_count');
      }
      return accept({ ...structuredClone(state), territoryCount: count });
    }
    case 'set_territory': {
      if (!state.catalog.some((t) => t.id === action.id)) return reject('unknown_territory');
      const inPlay = new Set(state.territories.map((t) => t.id));
      if (action.inPlay) inPlay.add(action.id);
      else inPlay.delete(action.id);
      return accept({
        ...structuredClone(state),
        territories: state.catalog.filter((t) => inPlay.has(t.id)).map((t) => ({ ...t, owner: null })),
      });
    }
    case 'start_game':
      if (state.territories.length !== state.territoryCount) return reject('count_mismatch');
      if (!ctx.foxesPresent) return reject('foxes_missing');
      return accept({ ...structuredClone(state), phase: 'opening' });
  }
}
