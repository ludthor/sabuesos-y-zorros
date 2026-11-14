import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  parseRoomPath,
  roomPath,
  type ServerMessage,
} from '@syz/protocol';
import type { Connection } from './connection.ts';
import { RoomQr } from './RoomQr.tsx';

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

  useEffect(() => {
    const unsubscribe = connection.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'room_created':
        case 'room_joined':
          goTo(roomPath(msg.code));
          return setView({ name: 'room', code: msg.code });
        case 'room_expired':
          backHome();
          return setView({ name: 'home', notice: 'La sala ha caducado tras 4 horas sin actividad.' });
        case 'error':
          backHome();
          return setView({
            name: 'home',
            notice:
              msg.error === 'room_not_found'
                ? `No hay ninguna sala con el código ${requestedCode.current ?? ''}. Conviene revisarlo.`
                : 'Algo ha fallado. Hay que volver a intentarlo.',
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
      return setView({
        name: 'home',
        notice: `Un código de sala tiene ${ROOM_CODE_LENGTH} caracteres, sin 0, O, 1, I ni L.`,
      });
    }
    requestedCode.current = code;
    setView({ name: 'waiting' });
    connection.send({ type: 'join_room', code });
  }

  return (
    <main className="page">
      {view.name === 'room' ? (
        <RoomScreen code={view.code} />
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

function RoomScreen({ code }: { code: string }) {
  const url = `${window.location.origin}${roomPath(code)}`;
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
        <strong>{window.location.host}</strong>.
      </p>
    </section>
  );
}
