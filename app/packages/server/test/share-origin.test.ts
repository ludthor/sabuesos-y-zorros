import { describe, expect, it } from 'vitest';
import { resolveShareOrigin } from '../src/share-origin.ts';

describe('dirección del QR', () => {
  it('usa PUBLIC_URL reducida a su origen', () => {
    expect(resolveShareOrigin('http://ejemplo.test/', [])).toBe('http://ejemplo.test');
    expect(resolveShareOrigin('https://ejemplo.test/ruta?x=1', [])).toBe('https://ejemplo.test');
  });

  it('rechaza una PUBLIC_URL que no es una dirección web', () => {
    expect(() => resolveShareOrigin('ejemplo.test', [])).toThrow(/PUBLIC_URL/);
    expect(() => resolveShareOrigin('ftp://ejemplo.test', [])).toThrow(/PUBLIC_URL/);
  });

  it('sin PUBLIC_URL, usa la primera dirección de la red local', () => {
    expect(resolveShareOrigin(undefined, ['http://192.168.1.10:3000', 'http://10.0.0.2:3000'])).toBe(
      'http://192.168.1.10:3000',
    );
    expect(resolveShareOrigin(undefined, [])).toBeNull();
  });
});
