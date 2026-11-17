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

const CATALOG = [
  { id: 'T01', name: 'Pregunta y objetivos', guide: '¿Qué problema aborda el proyecto y qué quiere conseguir?' },
  { id: 'T02', name: 'Antecedentes', guide: '¿Qué se sabía antes y en qué se apoya?' },
  { id: 'T03', name: 'Método', guide: '¿Cómo se hizo y por qué así?' },
];

const BOARD: BoardView = {
  phase: 'setup',
  catalog: CATALOG,
  territoryCount: 2,
  territories: [
    { ...CATALOG[0]!, owner: null },
    { ...CATALOG[2]!, owner: null },
  ],
  current: null,
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

  it('si el servidor no deja cambiar de bando, el dispositivo sigue en la sala con el suyo', async () => {
    const { reply } = await inRoom();
    await reply({ type: 'room_state', side: 'foxes', board: BOARD, devices: { foxes: 1, hounds: 0 } });
    await reply({ type: 'error', error: 'side_locked' });
    expect(screen.getByTestId('own-side').textContent).toMatch(/Zorros/);
    expect(window.location.pathname).toBe('/sala/K7MPX');
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

describe('preparación de la partida (C0-02)', () => {
  async function asSide(side: 'hounds' | 'foxes', board: BoardView = BOARD, devices = { foxes: 1, hounds: 1 }) {
    const fake = fakeConnection();
    render(<App connection={fake.connection} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    await fake.reply({ type: 'room_created', code: 'K7MPX' });
    await fake.reply({ type: 'room_state', side, board, devices });
    fake.sent.length = 0;
    return fake;
  }

  it('el tiempo de preguntas sugiere el número de territorios del §7', async () => {
    const { sent } = await asSide('hounds');
    const minutes = screen.getByLabelText('Tiempo de preguntas (minutos)');
    fireEvent.change(minutes, { target: { value: '2' } });
    fireEvent.change(minutes, { target: { value: '25' } });
    expect(screen.getByText(/se sugieren 4 territorios/)).toBeDefined();
    expect(sent).toEqual([]); // nada mientras se escribe
    fireEvent.blur(minutes);
    expect(sent).toEqual([{ type: 'game_action', action: { type: 'set_territory_count', count: 4 } }]);
  });

  it('el número se puede cambiar entre 3 y 6', async () => {
    const { sent } = await asSide('hounds');
    const group = screen.getByRole('radiogroup', { name: 'Número de territorios' });
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['3', '4', '5', '6']);
    fireEvent.click(within(group).getByRole('radio', { name: '5' }));
    expect(sent).toEqual([{ type: 'game_action', action: { type: 'set_territory_count', count: 5 } }]);
  });

  it('se marcan los territorios de entre los del §6.4', async () => {
    const { sent } = await asSide('hounds');
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    expect((screen.getByRole('checkbox', { name: /Método/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /Antecedentes/ }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox', { name: /Antecedentes/ }));
    expect(sent).toEqual([{ type: 'game_action', action: { type: 'set_territory', id: 'T02', inPlay: true } }]);
  });

  it('«Empezar la partida» solo se activa con la configuración completa y algún zorro en la sala', async () => {
    const { reply, sent } = await asSide('hounds', { ...BOARD, territoryCount: 3 });
    const start = () => screen.getByRole('button', { name: 'Empezar la partida' }) as HTMLButtonElement;
    expect(start().disabled).toBe(true);
    expect(screen.getByText(/Hay que marcar 3 territorios/)).toBeDefined();

    await reply({ type: 'room_state', side: 'hounds', board: BOARD, devices: { foxes: 0, hounds: 1 } });
    expect(start().disabled).toBe(true);
    expect(screen.getByText(/dispositivo de los zorros/)).toBeDefined();

    await reply({ type: 'room_state', side: 'hounds', board: BOARD, devices: { foxes: 1, hounds: 1 } });
    expect(start().disabled).toBe(false);
    fireEvent.click(start());
    expect(sent).toEqual([{ type: 'game_action', action: { type: 'start_game' } }]);
  });

  it('los zorros ven la configuración, pero no pueden cambiarla', async () => {
    await asSide('foxes');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Empezar la partida' })).toBeNull();
    expect(screen.getByText(/Los sabuesos preparan la partida/).textContent).toMatch(/2 de 2/);
    expect(within(screen.getByRole('list', { name: 'Territorios en juego' })).getAllByRole('listitem')).toHaveLength(2);
  });

  it('al empezar, los zorros eligen el primer territorio en disputa', async () => {
    const { sent } = await asSide('foxes', { ...BOARD, phase: 'first_pick' });
    fireEvent.click(screen.getByRole('button', { name: /Método/ }));
    expect(sent).toEqual([{ type: 'game_action', action: { type: 'choose_first_territory', id: 'T03' } }]);
  });

  it('mientras tanto, los sabuesos ven que eligen los zorros', async () => {
    await asSide('hounds', { ...BOARD, phase: 'first_pick' });
    expect(screen.getByText(/Los zorros eligen por qué territorio se empieza/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Método/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Pasar a/ })).toBeNull();
  });

  it('con la partida en marcha, se ve qué territorio está en disputa', async () => {
    await asSide('hounds', { ...BOARD, phase: 'playing', current: 'T03' });
    const current = screen.getByText('Método').closest('li')!;
    expect(current.getAttribute('aria-current')).toBe('true');
    expect(within(current).getByText('En disputa')).toBeDefined();
  });

  it('si el servidor rechaza una acción, se explica sin salir de la sala', async () => {
    const { reply } = await asSide('hounds');
    await reply({ type: 'action_rejected', reason: 'foxes_missing' });
    expect(screen.getByRole('alert').textContent).toBe(NOTICES.rejected.foxes_missing);
    expect(screen.getByTestId('own-side')).toBeDefined();
  });
});
