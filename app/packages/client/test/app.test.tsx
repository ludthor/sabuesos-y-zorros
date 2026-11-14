import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClientMessage, ServerMessage } from '@syz/protocol';
import { App } from '../src/App.tsx';
import type { Connection } from '../src/connection.ts';

/** Conexión falsa: guarda lo enviado y deja que la prueba responda como el servidor. */
function fakeConnection() {
  const sent: ClientMessage[] = [];
  const listeners = new Set<(m: ServerMessage) => void>();
  const connection: Connection = {
    send: (m) => void sent.push(m),
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const reply = (m: ServerMessage) => act(() => listeners.forEach((l) => l(m)));
  return { connection, sent, reply };
}

beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(cleanup);

describe('página de inicio (C0-01)', () => {
  it('«Nueva partida» muestra un código corto y un QR que lleva a la sala', async () => {
    const { connection, sent, reply } = fakeConnection();
    render(<App connection={connection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    expect(sent).toEqual([{ type: 'create_room' }]);
    await reply({ type: 'room_created', code: 'K7MPX' });

    expect(screen.getByTestId('room-code').textContent).toBe('K7MPX');
    const qr = await screen.findByRole('img', { name: /QR/ });
    expect(qr.getAttribute('data-url')).toBe(`${window.location.origin}/sala/K7MPX`);
    expect(qr.querySelector('svg')).not.toBeNull();
    expect(window.location.pathname).toBe('/sala/K7MPX');
  });

  it('un código que no existe muestra un aviso y no entra en ninguna sala', async () => {
    const { connection, sent, reply } = fakeConnection();
    render(<App connection={connection} />);

    fireEvent.change(screen.getByLabelText('Código de la sala'), { target: { value: 'zzzzz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(sent).toEqual([{ type: 'join_room', code: 'ZZZZZ' }]);
    await reply({ type: 'error', error: 'room_not_found' });

    expect(screen.getByRole('alert').textContent).toMatch(/ZZZZZ/);
    expect(screen.queryByTestId('room-code')).toBeNull();
    expect(screen.getByRole('button', { name: 'Nueva partida' })).toBeDefined();
    expect(window.location.pathname).toBe('/');
  });

  it('un código con forma incorrecta avisa sin preguntar al servidor', () => {
    const { connection, sent } = fakeConnection();
    render(<App connection={connection} />);

    fireEvent.change(screen.getByLabelText('Código de la sala'), { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(sent).toEqual([]);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.queryByTestId('room-code')).toBeNull();
  });

  it('abrir el enlace del QR de una sala que no existe avisa y vuelve al inicio', async () => {
    window.history.replaceState(null, '', '/sala/ZZZZZ');
    const { connection, sent, reply } = fakeConnection();
    render(<App connection={connection} />);

    expect(sent).toEqual([{ type: 'join_room', code: 'ZZZZZ' }]);
    await reply({ type: 'error', error: 'room_not_found' });

    expect(screen.getByRole('alert').textContent).toMatch(/ZZZZZ/);
    expect(screen.queryByTestId('room-code')).toBeNull();
    expect(window.location.pathname).toBe('/');
  });

  it('abrir el enlace del QR de una sala que existe entra en ella', async () => {
    window.history.replaceState(null, '', '/sala/K7MPX');
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    await reply({ type: 'room_joined', code: 'K7MPX' });
    expect(screen.getByTestId('room-code').textContent).toBe('K7MPX');
  });

  it('si la sala caduca, se avisa y se vuelve al inicio', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'room_created', code: 'K7MPX' });
    await reply({ type: 'room_expired' });

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.queryByTestId('room-code')).toBeNull();
    expect(window.location.pathname).toBe('/');
  });
});
