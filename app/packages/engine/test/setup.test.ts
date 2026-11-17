import { describe, expect, it } from 'vitest';
import {
  applyAction,
  boardFor,
  canChangeSide,
  createGame,
  suggestedTerritoryCount,
  type GameAction,
  type GameState,
  type Side,
  type Territory,
} from '../src/index.ts';

const SIX: Territory[] = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'].map((id) => ({
  id,
  name: `Territorio ${id}`,
  guide: `¿Pregunta guía de ${id}?`,
}));

const FOXES_HERE = { foxesPresent: true };

/** Aplica una acción que debe aceptarse y devuelve el estado nuevo. */
function ok(state: GameState, side: Side, action: GameAction, ctx = FOXES_HERE): GameState {
  const result = applyAction(state, side, action, ctx);
  if (!result.ok) throw new Error(`rechazada: ${result.error}`);
  return result.state;
}

function rejected(state: GameState, side: Side, action: GameAction, ctx = FOXES_HERE) {
  const result = applyAction(state, side, action, ctx);
  return result.ok ? null : result.error;
}

/** Una partida preparada con cuatro territorios: T01, T03, T04 y T06. */
function readyWithFour(): GameState {
  let g = ok(createGame(SIX), 'hounds', { type: 'set_territory_count', count: 4 });
  g = ok(g, 'hounds', { type: 'set_territory', id: 'T02', inPlay: false });
  return ok(g, 'hounds', { type: 'set_territory', id: 'T05', inPlay: false });
}

describe('territorios según el tiempo de preguntas (§7)', () => {
  it.each([
    [5, 3],
    [20, 3],
    [21, 4],
    [30, 4],
    [31, 5],
    [40, 5],
    [41, 6],
    [90, 6],
  ])('con %i minutos sugiere %i territorios', (minutes, count) => {
    expect(suggestedTerritoryCount(minutes)).toBe(count);
  });

  it('con justo 20, 30 o 40 minutos aplica el tramo menor (Ariel, C0-02)', () => {
    expect([20, 30, 40].map(suggestedTerritoryCount)).toEqual([3, 4, 5]);
  });
});

describe('preparación (§3.4)', () => {
  it('una partida nueva juega los seis territorios hasta que el tribunal elija (Ariel, C0-03)', () => {
    const g = createGame(SIX);
    expect(g.territoryCount).toBe(6);
    expect(g.territories.map((t) => t.id)).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06']);
  });

  it('el número de territorios se puede cambiar entre 3 y 6', () => {
    const g = createGame(SIX);
    for (const count of [3, 4, 5, 6]) {
      expect(ok(g, 'hounds', { type: 'set_territory_count', count }).territoryCount).toBe(count);
    }
    for (const count of [2, 7, 4.5, 0]) {
      expect(rejected(g, 'hounds', { type: 'set_territory_count', count })).toBe('invalid_count');
    }
  });

  it('solo se pueden marcar los seis territorios del §6.4', () => {
    expect(rejected(createGame(SIX), 'hounds', { type: 'set_territory', id: 'T99', inPlay: true })).toBe(
      'unknown_territory',
    );
  });

  it('marcar dos veces el mismo territorio no lo repite', () => {
    let g = ok(createGame(SIX), 'hounds', { type: 'set_territory', id: 'T02', inPlay: false });
    g = ok(g, 'hounds', { type: 'set_territory', id: 'T02', inPlay: true });
    g = ok(g, 'hounds', { type: 'set_territory', id: 'T02', inPlay: true });
    expect(g.territories.map((t) => t.id)).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06']);
  });

  it('los territorios en juego conservan el orden del §6.4', () => {
    let g = ok(createGame(SIX), 'hounds', { type: 'set_territory', id: 'T01', inPlay: false });
    g = ok(g, 'hounds', { type: 'set_territory', id: 'T01', inPlay: true });
    expect(g.territories[0]!.id).toBe('T01');
  });

  it('el tribunal decide: los zorros no pueden cambiar la configuración (Ariel, C0-02)', () => {
    const g = createGame(SIX);
    expect(rejected(g, 'foxes', { type: 'set_territory_count', count: 4 })).toBe('not_allowed');
    expect(rejected(g, 'foxes', { type: 'set_territory', id: 'T01', inPlay: false })).toBe('not_allowed');
    expect(rejected(readyWithFour(), 'foxes', { type: 'start_game' })).toBe('not_allowed');
  });
});

describe('empezar la partida', () => {
  it('no empieza si los territorios marcados no coinciden con el número elegido', () => {
    const g = ok(createGame(SIX), 'hounds', { type: 'set_territory_count', count: 4 });
    expect(rejected(g, 'hounds', { type: 'start_game' })).toBe('count_mismatch');
  });

  it('no empieza sin ningún dispositivo de los zorros en la sala (Ariel, C0-02)', () => {
    expect(rejected(readyWithFour(), 'hounds', { type: 'start_game' }, { foxesPresent: false })).toBe(
      'foxes_missing',
    );
  });

  it('al empezar, los zorros eligen el primer territorio en disputa (§3.4)', () => {
    let g = ok(readyWithFour(), 'hounds', { type: 'start_game' });
    expect(g.phase).toBe('opening');
    expect(g.current).toBeNull();
    expect(rejected(g, 'hounds', { type: 'choose_first_territory', id: 'T03' })).toBe('not_allowed');

    g = ok(g, 'foxes', { type: 'choose_first_territory', id: 'T03' });
    expect(g.phase).toBe('playing');
    expect(g.current).toBe('T03');
  });

  it('el primer territorio tiene que ser uno de los que están en juego', () => {
    const g = ok(readyWithFour(), 'hounds', { type: 'start_game' });
    expect(rejected(g, 'foxes', { type: 'choose_first_territory', id: 'T02' })).toBe('unknown_territory');
  });

  it('una vez empezada, la configuración ya no cambia ni se vuelve a empezar', () => {
    const g = ok(readyWithFour(), 'hounds', { type: 'start_game' });
    expect(rejected(g, 'hounds', { type: 'set_territory_count', count: 3 })).toBe('wrong_phase');
    expect(rejected(g, 'hounds', { type: 'set_territory', id: 'T02', inPlay: true })).toBe('wrong_phase');
    expect(rejected(g, 'hounds', { type: 'start_game' })).toBe('wrong_phase');
  });

  it('no se elige el primer territorio antes de empezar ni dos veces', () => {
    expect(rejected(readyWithFour(), 'foxes', { type: 'choose_first_territory', id: 'T01' })).toBe('wrong_phase');
    let g = ok(readyWithFour(), 'hounds', { type: 'start_game' });
    g = ok(g, 'foxes', { type: 'choose_first_territory', id: 'T01' });
    expect(rejected(g, 'foxes', { type: 'choose_first_territory', id: 'T03' })).toBe('wrong_phase');
  });

  it('al empezar ya no se puede cambiar de bando (Ariel, C0-03)', () => {
    expect(canChangeSide(readyWithFour())).toBe(true);
    expect(canChangeSide(ok(readyWithFour(), 'hounds', { type: 'start_game' }))).toBe(false);
  });

  it('las acciones no modifican el estado anterior', () => {
    const before = readyWithFour();
    const snapshot = structuredClone(before);
    ok(before, 'hounds', { type: 'start_game' });
    ok(before, 'hounds', { type: 'set_territory', id: 'T01', inPlay: false });
    expect(before).toEqual(snapshot);
  });
});

describe('vista del tablero', () => {
  it('muestra a ambos bandos los seis territorios posibles, el número elegido y el territorio en disputa', () => {
    let g = ok(readyWithFour(), 'hounds', { type: 'start_game' });
    g = ok(g, 'foxes', { type: 'choose_first_territory', id: 'T04' });
    const board = boardFor(g, 'foxes');
    expect(board.catalog.map((t) => t.id)).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06']);
    expect(board.territoryCount).toBe(4);
    expect(board.territories.map((t) => t.id)).toEqual(['T01', 'T03', 'T04', 'T06']);
    expect(board.current).toBe('T04');
    expect(boardFor(g, 'hounds')).toEqual(board);
  });
});
