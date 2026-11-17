import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Side } from '@syz/engine';
import {
  ROOM_CODE_CONFUSABLES,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  ROOM_UNUSED_TTL_MS,
  isRoomCode,
  normalizeRoomCode,
  parseRoomPath,
  roomPath,
  type ServerMessage,
} from '@syz/protocol';
import { Animal } from './Animal.tsx';
import type { Connection, ConnectionEvent } from './connection.ts';
import { RoomQr } from './RoomQr.tsx';

type RoomState = Extract<ServerMessage, { type: 'room_state' }>;

/** Los textos que leen los jugadores van en tercera persona, como las cartas. */
const SIDE_NAMES: Record<Side, string> = { hounds: 'Sabuesos', foxes: 'Zorros' };
const SIDE_WITH_ARTICLE: Record<Side, string> = { hounds: 'los sabuesos', foxes: 'los zorros' };
const OTHER: Record<Side, Side> = { hounds: 'foxes', foxes: 'hounds' };
const SIDE_ORDER: readonly Side[] = ['hounds', 'foxes'];

function devicesLabel(n: number): string {
  return `${n} ${n === 1 ? 'dispositivo' : 'dispositivos'}`;
}

/** «0, O, 1, I ni L» */
function listWithNi(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ni ${items.at(-1)}`;
}

const TTL_HOURS = ROOM_TTL_MS / (60 * 60 * 1000);
const UNUSED_MINUTES = ROOM_UNUSED_TTL_MS / (60 * 1000);
export const NOTICES = {
  badShape: `Un código de sala tiene ${ROOM_CODE_LENGTH} caracteres, sin ${listWithNi(ROOM_CODE_CONFUSABLES)}.`,
  expired: `La sala ha caducado tras ${TTL_HOURS} horas sin actividad.`,
  unused: `La sala se ha cerrado porque nadie se unió en ${UNUSED_MINUTES} minutos.`,
  notFound: (code: string) => `No hay ninguna sala con el código ${code}. Conviene revisarlo.`,
  lost: 'Se ha perdido la conexión con el servidor. Hay que recargar la página.',
  failed: 'Algo ha fallado. Hay que volver a intentarlo.',
};

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]' || hostname.startsWith('127.');
}

type View =
  | { name: 'home'; notice?: string }
  | { name: 'waiting' }
  | { name: 'room'; code: string; state?: RoomState };

function goTo(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
}

function backHome() {
  window.history.replaceState(null, '', '/');
}

export function App({ connection }: { connection: Connection }) {
  const initialCode = useRef(parseRoomPath(window.location.pathname));
  const requestedCode = useRef<string | null>(initialCode.current);
  const [view, setView] = useState<View>(initialCode.current ? { name: 'waiting' } : { name: 'home' });
  const [shareOrigin, setShareOrigin] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = connection.subscribe((msg: ConnectionEvent) => {
      switch (msg.type) {
        case 'welcome':
          return setShareOrigin(msg.shareOrigin);
        case 'connection_lost':
          // La dirección no cambia: al recargar, /sala/CÓDIGO vuelve a entrar si la sala sigue viva.
          return setView({ name: 'home', notice: NOTICES.lost });
        case 'room_created':
        case 'room_joined':
          goTo(roomPath(msg.code));
          return setView({ name: 'room', code: msg.code });
        case 'room_state':
          return setView((v) => (v.name === 'room' ? { ...v, state: msg } : v));
        case 'room_expired':
          backHome();
          return setView({ name: 'home', notice: msg.reason === 'unused' ? NOTICES.unused : NOTICES.expired });
        case 'error':
          backHome();
          return setView({
            name: 'home',
            notice:
              msg.error === 'room_not_found' ? NOTICES.notFound(requestedCode.current ?? '') : NOTICES.failed,
          });
      }
    });
    if (initialCode.current) connection.send({ type: 'join_room', code: initialCode.current });
    return unsubscribe;
  }, [connection]);

  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname === '/') setView({ name: 'home' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function createRoom() {
    setView({ name: 'waiting' });
    connection.send({ type: 'create_room' });
  }

  function joinRoom(raw: string) {
    const code = normalizeRoomCode(raw);
    if (!isRoomCode(code)) {
      return setView({ name: 'home', notice: NOTICES.badShape });
    }
    requestedCode.current = code;
    setView({ name: 'waiting' });
    connection.send({ type: 'join_room', code });
  }

  function chooseSide(side: Side) {
    connection.send({ type: 'choose_side', side });
  }

  return (
    <main className="page">
      {view.name === 'room' && view.state?.side && view.state.board ? (
        <BoardScreen code={view.code} shareOrigin={shareOrigin} state={view.state} onChooseSide={chooseSide} />
      ) : view.name === 'room' ? (
        <RoomScreen code={view.code} shareOrigin={shareOrigin} onChooseSide={chooseSide} />
      ) : (
        <HomeScreen
          notice={view.name === 'home' ? view.notice : undefined}
          busy={view.name === 'waiting'}
          onCreate={createRoom}
          onJoin={joinRoom}
        />
      )}
    </main>
  );
}

function Title() {
  return (
    <h1 className="title">
      <span className="title__hounds">Sabuesos</span> <span className="title__and">y</span>{' '}
      <span className="title__foxes">Zorros</span>
    </h1>
  );
}

function HomeScreen(props: {
  notice?: string;
  busy: boolean;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    props.onJoin(code);
  }

  return (
    <section className="home">
      <Title />
      <p className="lede">La mesa de juego para ensayar la defensa de un proyecto.</p>

      {props.notice && (
        <p className="notice" role="alert">
          {props.notice}
        </p>
      )}

      <button className="button button--primary" onClick={props.onCreate} disabled={props.busy}>
        Nueva partida
      </button>

      <form className="join" onSubmit={submit}>
        <label htmlFor="room-code">Código de la sala</label>
        <div className="join__row">
          <input
            id="room-code"
            className="join__input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={ROOM_CODE_LENGTH + 4}
            placeholder="K7MPX"
          />
          <button className="button" type="submit" disabled={props.busy}>
            Entrar
          </button>
        </div>
      </form>
    </section>
  );
}

/** Código, QR y dirección para que entren los demás dispositivos. */
function Invite({ code, shareOrigin }: { code: string; shareOrigin: string | null }) {
  // Abierta en localhost, la dirección propia no sirve a un móvil: se usa la que da el servidor.
  const local = isLoopback(window.location.hostname);
  const origin = local && shareOrigin ? shareOrigin : window.location.origin;
  const url = `${origin}${roomPath(code)}`;
  return (
    <>
      <p className="room__label">Código de la sala</p>
      <p className="room__code" data-testid="room-code" aria-label={code.split('').join(' ')}>
        {code}
      </p>
      <RoomQr code={code} url={url} />
      <p className="room__help">
        Los sabuesos y los zorros entran escaneando el QR o escribiendo el código en{' '}
        <strong>{origin.replace(/^[a-z]+:\/\//i, '')}</strong>.
      </p>
      {local && !shareOrigin && (
        <p className="notice" role="alert">
          Este QR lleva a este ordenador y no funcionará en un móvil. Hay que abrir la app con la
          dirección de la red local.
        </p>
      )}
    </>
  );
}

function RoomScreen(props: { code: string; shareOrigin: string | null; onChooseSide: (side: Side) => void }) {
  return (
    <section className="room">
      <Title />
      <Invite code={props.code} shareOrigin={props.shareOrigin} />
      <fieldset className="sides">
        <legend>¿De qué bando es este dispositivo?</legend>
        <div className="sides__row">
          {SIDE_ORDER.map((side) => (
            <button
              key={side}
              className={`button side-button side-button--${side}`}
              onClick={() => props.onChooseSide(side)}
            >
              <Animal side={side} />
              {SIDE_NAMES[side]}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function BoardScreen(props: {
  code: string;
  shareOrigin: string | null;
  state: RoomState;
  onChooseSide: (side: Side) => void;
}) {
  const side = props.state.side!;
  const board = props.state.board!;
  return (
    <section className="board">
      <header className="board__header">
        <p className={`side-badge side-badge--${side}`} data-testid="own-side">
          <Animal side={side} labelled />
          {SIDE_NAMES[side]}
        </p>
        <p className="board__room">
          Sala <strong>{props.code}</strong>
        </p>
      </header>

      <h2 id="score-title">Marcador</h2>
      <div className="score" role="group" aria-labelledby="score-title">
        {SIDE_ORDER.map((s) => (
          <div key={s} className={`score__side score__side--${s}`}>
            <Animal side={s} />
            <span className="score__name">{SIDE_NAMES[s]}</span>
            <p className="score__points" data-testid={`score-${s}`}>
              {board.score[s]}
            </p>
            <p className="score__devices" data-testid={`devices-${s}`}>
              {devicesLabel(props.state.devices[s])}
            </p>
          </div>
        ))}
      </div>

      <h2 id="territories-title">Territorios en juego</h2>
      <ol className="territories" aria-label="Territorios en juego">
        {board.territories.map((t) => (
          <li key={t.id} className="territory">
            <h3>{t.name}</h3>
            <p>{t.guide}</p>
            {t.owner && (
              <span className="territory__owner">
                <Animal side={t.owner} />
                Lo ganan {SIDE_WITH_ARTICLE[t.owner]}
              </span>
            )}
          </li>
        ))}
      </ol>

      {board.phase === 'setup' && (
        <button className="button" onClick={() => props.onChooseSide(OTHER[side])}>
          Pasar a {SIDE_WITH_ARTICLE[OTHER[side]]}
        </button>
      )}

      <details className="invite">
        <summary>Invitar a otro dispositivo</summary>
        <div className="invite__body">
          <Invite code={props.code} shareOrigin={props.shareOrigin} />
        </div>
      </details>
    </section>
  );
}
