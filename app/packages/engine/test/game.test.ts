import { describe, expect, it } from 'vitest';
import { boardFor, canChangeSide, createGame, parseTerritories, type Territory } from '../src/index.ts';

const TERRITORIES: Territory[] = [
  { id: 'T01', name: 'Pregunta y objetivos', guide: '¿Qué problema aborda el proyecto y qué quiere conseguir?' },
  { id: 'T03', name: 'Método', guide: '¿Cómo se hizo y por qué así?' },
];

describe('createGame', () => {
  it('empieza una partida en preparación con los territorios en juego y ninguno ganado (§3.4, §4.3)', () => {
    expect(createGame(TERRITORIES)).toEqual({
      phase: 'setup',
      territories: [
        { ...TERRITORIES[0], owner: null },
        { ...TERRITORIES[1], owner: null },
      ],
    });
  });

  it('devuelve un estado nuevo en cada llamada', () => {
    expect(createGame(TERRITORIES)).not.toBe(createGame(TERRITORIES));
  });
});

describe('boardFor (ADR-0001)', () => {
  it('cada bando ve los territorios y el marcador de territorios ganados', () => {
    const game = createGame(TERRITORIES);
    for (const side of ['foxes', 'hounds'] as const) {
      expect(boardFor(game, side)).toEqual({
        phase: 'setup',
        territories: game.territories,
        score: { foxes: 0, hounds: 0 },
      });
    }
  });

  it('el marcador cuenta las fichas grandes de cada bando (§4.3)', () => {
    const game = createGame(TERRITORIES);
    game.territories[1]!.owner = 'foxes';
    expect(boardFor(game, 'hounds').score).toEqual({ foxes: 1, hounds: 0 });
  });

  it('la vista no comparte objetos con el estado del servidor', () => {
    const game = createGame(TERRITORIES);
    const board = boardFor(game, 'foxes');
    board.territories[0]!.owner = 'hounds';
    expect(game.territories[0]!.owner).toBeNull();
  });
});

describe('canChangeSide', () => {
  it('un dispositivo puede cambiar de bando mientras la partida no ha empezado (Ariel, C0-03)', () => {
    expect(canChangeSide(createGame(TERRITORIES))).toBe(true);
    expect(canChangeSide(boardFor(createGame(TERRITORIES), 'foxes'))).toBe(true);
  });
});

describe('parseTerritories', () => {
  it('lee solo las filas de tipo territorio, con su pregunta guía (§6.4)', () => {
    const csv = [
      'id,tipo,nombre,copias,momento,solo_ensayo,solo_grupo,texto',
      'C10,cacería,Ciego pero con instinto,2,En lugar de preguntar,0,0,"Una frase, con coma. Y ""comillas""."',
      'T01,territorio,Pregunta y objetivos,1,,0,0,¿Qué problema aborda el proyecto y qué quiere conseguir?',
      'T05,territorio,Limitaciones,1,,0,0,"¿Qué no cubre, y qué podría fallar?"',
      '',
    ].join('\n');
    expect(parseTerritories(csv)).toEqual([
      { id: 'T01', name: 'Pregunta y objetivos', guide: '¿Qué problema aborda el proyecto y qué quiere conseguir?' },
      { id: 'T05', name: 'Limitaciones', guide: '¿Qué no cubre, y qué podría fallar?' },
    ]);
  });

  it('avisa con claridad si falta una columna', () => {
    expect(() => parseTerritories('id,tipo,nombre\nT01,territorio,Método\n')).toThrow(/texto/);
  });

  it('acepta finales de línea de Windows', () => {
    const csv = 'id,tipo,nombre,copias,momento,solo_ensayo,solo_grupo,texto\r\nT03,territorio,Método,1,,0,0,¿Cómo?\r\n';
    expect(parseTerritories(csv)).toEqual([{ id: 'T03', name: 'Método', guide: '¿Cómo?' }]);
  });
});
