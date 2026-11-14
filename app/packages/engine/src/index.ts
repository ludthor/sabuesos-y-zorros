/**
 * Motor de reglas de Sabuesos y Zorros (ADR-0002).
 *
 * Código puro, sin entrada ni salida: recibe un estado y una acción y devuelve
 * el estado nuevo o un error. Cada regla entra con una prueba que cita la
 * sección de docs/reglamento.md que implementa.
 *
 * C0-01 solo crea la partida vacía; las reglas llegan a partir de C0-02.
 */

export type Side = 'foxes' | 'hounds';

export interface GameState {
  phase: 'setup';
}

export function createGame(): GameState {
  return { phase: 'setup' };
}
