import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  MAX_TERRITORIES,
  MIN_TERRITORIES,
  canChangeSide,
  suggestedTerritoryCount,
  type BoardView,
  type GameAction,
  type RuleError,
  type Side,
} from '@syz/engine';
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
  rejected: {
    not_allowed: 'Eso no le corresponde a este bando.',
    wrong_phase: 'Eso ya no se puede hacer en este momento de la partida.',
    invalid_count: `Se juegan entre ${MIN_TERRITORIES} y ${MAX_TERRITORIES} territorios.`,
    unknown_territory: 'Ese territorio no está en juego.',
    count_mismatch: 'El número de territorios marcados no coincide con el número elegido.',
    foxes_missing: 'Para empezar, tiene que haber en la sala al menos un dispositivo de los zorros.',
  } satisfies Record<RuleError, string>,
};

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]' || hostname.startsWith('127.');
}

type View =
  | { name: 'home'; notice?: string }
  | { name: 'waiting' }
  | { name: 'room'; code: string; state?: RoomState; notice?: string };

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
          return setView((v) => (v.name === 'room' ? { ...v, state: msg, notice: undefined } : v));
        case 'action_rejected':
          return setView((v) => (v.name === 'room' ? { ...v, notice: NOTICES.rejected[msg.reason] } : v));
        case 'room_expired':
          backHome();
          return setView({ name: 'home', notice: msg.reason === 'unused' ? NOTICES.unused : NOTICES.expired });
        case 'error':
          // El servidor no saca de la sala a quien intenta cambiar de bando a destiempo.
          if (msg.error === 'side_locked') return;
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

  function act(action: GameAction) {
    connection.send({ type: 'game_action', action });
  }

  return (
    <main className="page">
      {view.name === 'room' && view.state?.side && view.state.board ? (
        <BoardScreen
          code={view.code}
          shareOrigin={shareOrigin}
          state={view.state}
          notice={view.notice}
          onChooseSide={chooseSide}
          onAction={act}
        />
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
function Invite({ code, shareOrigin, announce = true }: { code: string; shareOrigin: string | null; announce?: boolean }) {
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
        <p className="notice" role={announce ? 'alert' : undefined}>
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
  notice?: string;
  onChooseSide: (side: Side) => void;
  onAction: (action: GameAction) => void;
}) {
  const side = props.state.side!;
  const board = props.state.board!;
  const devices = props.state.devices;
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

      {props.notice && (
        <p className="notice" role="alert">
          {props.notice}
        </p>
      )}

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
              {devicesLabel(devices[s])}
            </p>
          </div>
        ))}
      </div>

      {board.phase === 'setup' && side === 'hounds' ? (
        <SetupPanel board={board} foxesHere={devices.foxes > 0} onAction={props.onAction} />
      ) : board.phase === 'opening' && side === 'foxes' ? (
        <FirstTerritoryPicker board={board} onAction={props.onAction} />
      ) : (
        <>
          {board.phase === 'setup' && (
            <p className="status">
              Los sabuesos preparan la partida: eligen cuántos territorios se juegan y cuáles.
            </p>
          )}
          {board.phase === 'opening' && (
            <p className="status">Los zorros eligen por qué territorio se empieza.</p>
          )}
          <TerritoryList board={board} />
        </>
      )}

      {canChangeSide(board) && (
        <button className="button" onClick={() => props.onChooseSide(OTHER[side])}>
          Pasar a {SIDE_WITH_ARTICLE[OTHER[side]]}
        </button>
      )}

      <details className="invite">
        <summary>Invitar a otro dispositivo</summary>
        <div className="invite__body">
          {/* Plegado, el aviso del QR no debe interrumpir: se lee al abrirlo. */}
          <Invite code={props.code} shareOrigin={props.shareOrigin} announce={false} />
        </div>
      </details>
    </section>
  );
}

function TerritoryList({ board }: { board: BoardView }) {
  return (
    <>
      <h2 id="territories-title">Territorios en juego</h2>
      <ol className="territories" aria-label="Territorios en juego">
        {board.territories.map((t) => {
          const current = t.id === board.current;
          return (
            <li
              key={t.id}
              className={`territory${current ? ' territory--current' : ''}`}
              aria-current={current ? 'true' : undefined}
            >
              {current && <span className="territory__tag">En disputa</span>}
              <h3>{t.name}</h3>
              <p>{t.guide}</p>
              {t.owner && (
                <span className="territory__owner">
                  <Animal side={t.owner} />
                  Lo ganan {SIDE_WITH_ARTICLE[t.owner]}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** El tribunal elige cuántos territorios se juegan y cuáles (§3.4, §7). */
function SetupPanel(props: { board: BoardView; foxesHere: boolean; onAction: (action: GameAction) => void }) {
  const { board, onAction } = props;
  const [minutes, setMinutes] = useState('');
  const minutesValue = Number(minutes);
  const suggestion = minutes !== '' && minutesValue > 0 ? suggestedTerritoryCount(minutesValue) : null;
  const marked = board.territories.length;
  const inPlay = new Set(board.territories.map((t) => t.id));
  const blocker =
    marked !== board.territoryCount
      ? `Hay que marcar ${board.territoryCount} territorios; ahora hay ${marked} marcados.`
      : !props.foxesHere
        ? 'Falta que entre en la sala algún dispositivo de los zorros: son ellos quienes eligen el primer territorio.'
        : null;

  function changeMinutes(value: string) {
    setMinutes(value);
    const n = Number(value);
    if (value === '' || !(n > 0)) return;
    const count = suggestedTerritoryCount(n);
    if (count !== board.territoryCount) onAction({ type: 'set_territory_count', count });
  }

  const counts = Array.from({ length: MAX_TERRITORIES - MIN_TERRITORIES + 1 }, (_, i) => MIN_TERRITORIES + i);

  return (
    <section className="setup" aria-labelledby="setup-title">
      <h2 id="setup-title">Preparar la partida</h2>

      <div className="setup__field">
        <label htmlFor="minutes">Tiempo de preguntas (minutos)</label>
        <input
          id="minutes"
          className="join__input setup__minutes"
          type="number"
          inputMode="numeric"
          min={1}
          value={minutes}
          onChange={(e) => changeMinutes(e.target.value)}
          placeholder="30"
        />
        {suggestion !== null && (
          <p className="setup__hint">
            Para {minutesValue} minutos se sugieren {suggestion} territorios.
          </p>
        )}
      </div>

      <div className="setup__field">
        <span id="count-label">Número de territorios</span>
        <div className="segmented" role="radiogroup" aria-labelledby="count-label">
          {counts.map((n) => (
            <label key={n} className={`segmented__option${n === board.territoryCount ? ' is-checked' : ''}`}>
              <input
                type="radio"
                name="territory-count"
                value={n}
                checked={n === board.territoryCount}
                onChange={() => onAction({ type: 'set_territory_count', count: n })}
              />
              {n}
            </label>
          ))}
        </div>
      </div>

      <fieldset className="setup__field picks">
        <legend>
          Territorios en juego{' '}
          <span className="picks__count">
            ({marked} de {board.territoryCount})
          </span>
        </legend>
        {board.catalog.map((t) => (
          <label key={t.id} className={`pick${inPlay.has(t.id) ? ' is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={inPlay.has(t.id)}
              onChange={(e) => onAction({ type: 'set_territory', id: t.id, inPlay: e.target.checked })}
            />
            <span>
              <strong>{t.name}</strong>
              <span className="pick__guide">{t.guide}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {blocker && (
        <p className="setup__hint" id="start-blocker">
          {blocker}
        </p>
      )}
      <button
        className="button button--primary"
        disabled={blocker !== null}
        aria-describedby={blocker ? 'start-blocker' : undefined}
        onClick={() => onAction({ type: 'start_game' })}
      >
        Empezar la partida
      </button>
    </section>
  );
}

/** Los zorros eligen por qué territorio se empieza (§3.4). */
function FirstTerritoryPicker({ board, onAction }: { board: BoardView; onAction: (action: GameAction) => void }) {
  return (
    <section className="opening" aria-labelledby="opening-title">
      <h2 id="opening-title">¿Por qué territorio se empieza?</h2>
      <p className="status">Los zorros eligen el primer territorio en disputa.</p>
      <div className="territories">
        {board.territories.map((t) => (
          <button
            key={t.id}
            className="territory territory--choice"
            onClick={() => onAction({ type: 'choose_first_territory', id: t.id })}
          >
            <h3>{t.name}</h3>
            <p>{t.guide}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
