import { describe, expect, it } from 'vitest';
import { createGame } from '../src/index.ts';

describe('createGame', () => {
  it('empieza una partida nueva en preparación', () => {
    expect(createGame()).toEqual({ phase: 'setup' });
  });

  it('devuelve un estado nuevo en cada llamada', () => {
    expect(createGame()).not.toBe(createGame());
  });
});
