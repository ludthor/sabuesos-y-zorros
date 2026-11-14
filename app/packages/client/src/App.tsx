import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ROOM_CODE_CONFUSABLES,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  isRoomCode,
  normalizeRoomCode,
  parseRoomPath,
  roomPath,
} from '@syz/protocol';
import type { Connection, ConnectionEvent } from './connection.ts';
import { RoomQr } from './RoomQr.tsx';

/** «0, O, 1, I ni L» */
function listWithNi(items: readonly string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ni ${items.at(-1)}`;
}

const TTL_HOURS = ROOM_TTL_MS / (60 * 60 * 1000);
export const NOTICES = {
  badShape: `Un código de sala tiene ${ROOM_CODE_LENGTH} caracteres, sin ${listWithNi(ROOM_CODE_CONFUSABLES)}.`,
  expired: `La sala ha caducado tras ${TTL_HOURS} horas sin actividad.`,
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
  | { name: 'room'; code: string };

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
        case 'room_expired':
          backHome();
          return setView({ name: 'home', notice: NOTICES.expired });
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

  return (
    <main className="page">
      {view.name === 'room' ? (
        <RoomScreen code={view.code} shareOrigin={shareOrigin} />
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

function RoomScreen({ code, shareOrigin }: { code: string; shareOrigin: string | null }) {
  // Abierta en localhost, la dirección propia no sirve a un móvil: se usa la que da el servidor.
  const local = isLoopback(window.location.hostname);
  const origin = local && shareOrigin ? shareOrigin : window.location.origin;
  const url = `${origin}${roomPath(code)}`;
  return (
    <section className="room">
      <Title />
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
    </section>
  );
}
