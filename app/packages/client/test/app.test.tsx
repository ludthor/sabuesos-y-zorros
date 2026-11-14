import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClientMessage } from '@syz/protocol';
import { App, NOTICES } from '../src/App.tsx';
import type { Connection, ConnectionEvent } from '../src/connection.ts';

/** Conexión falsa: guarda lo enviado y deja que la prueba responda como el servidor. */
function fakeConnection() {
  const sent: ClientMessage[] = [];
  const listeners = new Set<(m: ConnectionEvent) => void>();
  const connection: Connection = {
    send: (m) => void sent.push(m),
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const reply = (m: ConnectionEvent) => act(() => listeners.forEach((l) => l(m)));
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

  it('abierta en localhost, el QR usa la dirección de red local que da el servidor', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    await reply({ type: 'welcome', shareOrigin: 'http://192.168.1.10:3000' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'room_created', code: 'K7MPX' });

    const qr = await screen.findByRole('img', { name: /QR/ });
    expect(qr.getAttribute('data-url')).toBe('http://192.168.1.10:3000/sala/K7MPX');
    expect(screen.getByText('192.168.1.10:3000')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('abierta en localhost sin dirección de red local, avisa de que el QR no sirve a un móvil', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    await reply({ type: 'welcome', shareOrigin: null });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'room_created', code: 'K7MPX' });

    expect(screen.getByRole('alert').textContent).toMatch(/móvil/);
  });

  it('si se pierde la conexión, se avisa en lugar de quedarse esperando', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'connection_lost' });

    expect(screen.getByRole('alert').textContent).toBe(NOTICES.lost);
    expect((screen.getByRole('button', { name: 'Nueva partida' }) as HTMLButtonElement).disabled).toBe(false);

    // Un nuevo intento sin conexión vuelve a avisar (la conexión emite otra vez connection_lost).
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'connection_lost' });
    expect(screen.getByRole('alert').textContent).toBe(NOTICES.lost);
    expect((screen.getByRole('button', { name: 'Nueva partida' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('si se pierde la conexión dentro de una sala, la dirección se conserva para volver al recargar', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'room_created', code: 'K7MPX' });
    await reply({ type: 'connection_lost' });

    expect(screen.getByRole('alert').textContent).toBe(NOTICES.lost);
    expect(window.location.pathname).toBe('/sala/K7MPX');
  });

  it('los avisos salen de las constantes del protocolo', () => {
    expect(NOTICES.expired).toBe('La sala ha caducado tras 4 horas sin actividad.');
    expect(NOTICES.badShape).toBe('Un código de sala tiene 5 caracteres, sin 0, O, 1, I ni L.');
  });
});
