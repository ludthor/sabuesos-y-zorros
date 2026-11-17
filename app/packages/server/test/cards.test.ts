import { describe, expect, it } from 'vitest';
import { loadTerritories } from '../src/cards.ts';

describe('territorios desde cartas/cartas.csv', () => {
  it('son los seis del §6.4, en orden y con su pregunta guía', () => {
    const territories = loadTerritories();
    expect(territories.map((t) => t.name)).toEqual([
      'Pregunta y objetivos',
      'Antecedentes',
      'Método',
      'Resultados',
      'Limitaciones',
      'Contribución',
    ]);
    expect(territories.find((t) => t.name === 'Método')?.guide).toBe('¿Cómo se hizo y por qué así?');
  });
});
