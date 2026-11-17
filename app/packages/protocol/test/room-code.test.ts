import { describe, expect, it } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_CONFUSABLES,
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  parseRoomPath,
  roomPath,
} from '../src/index.ts';

describe('código de sala (C0-01)', () => {
  it('no usa caracteres que se confunden al dictarlos', () => {
    expect(ROOM_CODE_CONFUSABLES).toEqual(expect.arrayContaining(['0', 'O', '1', 'I', 'L']));
    for (const c of ROOM_CODE_CONFUSABLES) expect(ROOM_CODE_ALPHABET).not.toContain(c);
  });

  it('es corto', () => {
    expect(ROOM_CODE_LENGTH).toBeLessThanOrEqual(6);
  });

  it('acepta minúsculas, espacios y guiones al introducirlo', () => {
    expect(normalizeRoomCode(' k7m-px ')).toBe('K7MPX');
  });

  it('reconoce solo códigos con la forma correcta', () => {
    expect(isRoomCode('K7MPX')).toBe(true);
    expect(isRoomCode('K7MP')).toBe(false);
    expect(isRoomCode('K7MP0')).toBe(false);
  });

  it('la dirección de la sala lleva el código', () => {
    expect(roomPath('K7MPX')).toBe('/sala/K7MPX');
    expect(parseRoomPath('/sala/K7MPX')).toBe('K7MPX');
    expect(parseRoomPath('/sala/k7mpx/')).toBe('K7MPX');
    expect(parseRoomPath('/')).toBeNull();
  });
});
