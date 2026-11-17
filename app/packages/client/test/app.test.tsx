import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BoardView } from '@syz/engine';
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
    await reply({ type: 'room_expired', reason: 'inactive' });

    expect(screen.getByRole('alert').textContent).toBe(NOTICES.expired);
    expect(screen.queryByTestId('room-code')).toBeNull();
    expect(window.location.pathname).toBe('/');
  });

  it('si nadie se une en 15 minutos, se avisa de por qué se cerró la sala', async () => {
    const { connection, reply } = fakeConnection();
    render(<App connection={connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await reply({ type: 'room_created', code: 'K7MPX' });
    await reply({ type: 'room_expired', reason: 'unused' });

    expect(screen.getByRole('alert').textContent).toBe(NOTICES.unused);
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
    expect(NOTICES.unused).toBe('La sala se ha cerrado porque nadie se unió en 15 minutos.');
    expect(NOTICES.badShape).toBe('Un código de sala tiene 5 caracteres, sin 0, O, 1, I ni L.');
  });
});

const BOARD: BoardView = {
  phase: 'setup',
  territories: [
    { id: 'T01', name: 'Pregunta y objetivos', guide: '¿Qué problema aborda el proyecto y qué quiere conseguir?', owner: null },
    { id: 'T03', name: 'Método', guide: '¿Cómo se hizo y por qué así?', owner: null },
  ],
  score: { foxes: 0, hounds: 0 },
};

describe('bandos (C0-03)', () => {
  async function inRoom() {
    const fake = fakeConnection();
    render(<App connection={fake.connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await fake.reply({ type: 'room_created', code: 'K7MPX' });
    await fake.reply({ type: 'room_state', side: null, board: null, devices: { foxes: 0, hounds: 0 } });
    fake.sent.length = 0;
    return fake;
  }

  it('al entrar en la sala, el dispositivo elige su bando', async () => {
    const { sent } = await inRoom();
    expect(screen.getByTestId('room-code').textContent).toBe('K7MPX');
    fireEvent.click(screen.getByRole('button', { name: /Zorros/ }));
    expect(sent).toEqual([{ type: 'choose_side', side: 'foxes' }]);
  });

  it('con el bando elegido, ve los territorios en juego y el marcador', async () => {
    const { reply } = await inRoom();
    await reply({ type: 'room_state', side: 'foxes', board: BOARD, devices: { foxes: 1, hounds: 2 } });

    const territories = screen.getByRole('list', { name: 'Territorios en juego' });
    expect(within(territories).getAllByRole('listitem')).toHaveLength(2);
    expect(within(territories).getByText('Método')).toBeDefined();
    expect(within(territories).getByText('¿Cómo se hizo y por qué así?')).toBeDefined();

    expect(screen.getByTestId('score-foxes').textContent).toBe('0');
    expect(screen.getByTestId('score-hounds').textContent).toBe('0');
    expect(screen.getByTestId('devices-foxes').textContent).toBe('1 dispositivo');
    expect(screen.getByTestId('devices-hounds').textContent).toBe('2 dispositivos');
    expect(screen.queryByRole('button', { name: /^Zorros/ })).toBeNull();
  });

  it('el bando se reconoce por su nombre y su animal, no solo por el color (ADR-0007)', async () => {
    const { reply } = await inRoom();
    await reply({ type: 'room_state', side: 'hounds', board: BOARD, devices: { foxes: 0, hounds: 1 } });
    const badge = screen.getByTestId('own-side');
    expect(badge.textContent).toMatch(/Sabuesos/);
    expect(within(badge).getByRole('img', { name: 'Sabueso' })).toBeDefined();
  });

  it('antes de empezar, puede pasar al otro bando', async () => {
    const { reply, sent } = await inRoom();
    await reply({ type: 'room_state', side: 'foxes', board: BOARD, devices: { foxes: 1, hounds: 0 } });
    fireEvent.click(screen.getByRole('button', { name: 'Pasar a los sabuesos' }));
    expect(sent).toEqual([{ type: 'choose_side', side: 'hounds' }]);
  });

  it('el marcador cambia cuando llega un estado nuevo', async () => {
    const { reply } = await inRoom();
    await reply({ type: 'room_state', side: 'foxes', board: BOARD, devices: { foxes: 1, hounds: 0 } });
    await reply({
      type: 'room_state',
      side: 'foxes',
      board: { ...BOARD, score: { foxes: 1, hounds: 0 } },
      devices: { foxes: 1, hounds: 1 },
    });
    expect(screen.getByTestId('score-foxes').textContent).toBe('1');
    expect(screen.getByTestId('devices-hounds').textContent).toBe('1 dispositivo');
  });
});
