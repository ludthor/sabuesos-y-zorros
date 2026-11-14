# Sabuesos y Zorros — instrucciones para agentes

Este repositorio contiene el juego de cartas (reglas, cartas y kit imprimible) y su versión digital, que se desarrolla por cortes verticales a partir de historias de usuario. Empieza siempre por el modo ensayo.

## Fuentes de verdad

| Qué | Dónde | Regla |
| --- | --- | --- |
| Reglas | `docs/reglamento.md` | Si el código y el reglamento no coinciden, manda el reglamento. |
| Cartas | `cartas/cartas.csv` | Ni la app ni el generador de PDF copian textos de cartas a mano: los leen del CSV. |
| Historias | `docs/backlog/` | Una historia por archivo. El índice está en `docs/backlog/README.md`. |
| Decisiones técnicas | `docs/adr/` | Una decisión por archivo. Una decisión nueva o un cambio de una existente se registra aquí. |

## Estructura

| Ruta | Contenido |
| --- | --- |
| `docs/` | Reglamento, fundamentos, historial de diseño, hoja de observación, backlog y ADR |
| `cartas/` | `cartas.csv` |
| `herramientas/` | `generar_cartas.py` (kit imprimible) |
| `imprimir/` | PDF generados; no se editan a mano |
| `app/` | Versión digital (la crea la historia C0-01) |
| `.claude/` | Agente `revisor` y comando `/historia` |

## Principios de la versión digital

- La app hace de mesa, no de juego. Nunca pide escribir las preguntas ni las respuestas: la conversación es oral.
- El servidor guarda el estado y envía a cada dispositivo solo lo que su bando puede ver. Ningún cliente recibe la mano del otro bando (ADR-0001).
- El motor de reglas es código puro, sin entrada ni salida, compartido por cliente y servidor (ADR-0002). Cada regla entra con una prueba que cita la sección del reglamento.
- La configuración de referencia es una pantalla por bando. Las vistas son tablero, mano y mando, y un dispositivo puede mostrar varias.
- Ningún dato personal en el servidor; la sala caduca (ADR-0006). El marcador nunca se presenta como nota.
- La línea gráfica pop geométrico entra desde el primer corte (ADR-0007): azul cobalto `#2747D6` para sabuesos, naranja `#FF6A2B` para zorros, amarillo `#FFC93C` para territorios, tinta `#141414`, crema `#FFF4E6`, tipografía Bricolage Grotesque (`fuentes/`).

## Cómo se trabaja una historia

El atajo es `/historia <id>`, por ejemplo `/historia C0-01`.

1. Lee la historia y las secciones del reglamento que cita. Si su estado no es `lista` o alguna dependencia no está `hecha`, detente y dilo.
2. Crea una rama `historia/<id>-<slug>`, por ejemplo `historia/C0-01-crear-sala`.
3. Escribe primero las pruebas automáticas de los criterios de aceptación y comprueba que fallan.
4. Implementa lo mínimo para que pasen, atravesando las capas que haga falta (interfaz, reglas, servidor).
5. Si una regla admite dos lecturas, detente y pregunta a Ariel. No inventes reglas. La respuesta se escribe en `docs/reglamento.md` o en la historia, nunca solo en el código.
6. Pide la revisión al agente `revisor` y resuelve lo que señale hasta que apruebe.
7. Cambia el estado de la historia a `en revisión` y deja en ella una nota breve de qué probar en dos dispositivos. Solo Ariel la pasa a `hecha`.

Si cambia una regla o una carta: actualiza `docs/reglamento.md` y `cartas/cartas.csv`, regenera los PDF con `make pdf` y anota el cambio en `CHANGELOG.md`.

## Lista para empezar

- Sigue el formato de `docs/backlog/README.md`.
- Sus criterios se pueden comprobar con una prueba automática o en dos dispositivos.
- Cita la sección del reglamento que implementa.
- Sus dependencias están hechas.
- Cabe en una sesión de agente. Si no cabe, se parte en dos.

## Hecha

- Todas las pruebas pasan, incluidas las de sus criterios.
- El agente `revisor` no tiene objeciones abiertas.
- Está desplegada en la dirección de pruebas (desde C0-06).
- Se ha probado en un móvil y en un portátil reales.
- Ariel la ha visto funcionar y la acepta.
- No hay diferencias entre la app, `docs/reglamento.md` y `cartas/cartas.csv`.

## Idioma y estilo

- Documentación, mensajes de commit y textos de la interfaz, en español. Los textos que leen los jugadores van en tercera persona ("los zorros", "el sabueso"), como las cartas.
- Código e identificadores en inglés, con este glosario:

| Juego | Código |
| --- | --- |
| zorros, sabuesos | `foxes`, `hounds` |
| bando | `side` |
| territorio | `territory` |
| cacería, supervivencia | `hunt`, `survival` |
| momento de una carta | `timing` |
| mano, mazo, descarte | `hand`, `deck`, `discard` |
| ficha grande, marcador pequeño | `token`, `marker` |
| pregunta sin efecto | `void` |
| presidente, secretario, vocal, supervisor | `chair`, `secretary`, `member`, `supervisor` |
| modo ensayo, modo tribunal | `rehearsal`, `panel` |

## Comandos

- `make pdf`: regenera el kit imprimible a partir de `cartas/cartas.csv`.

La app (Node 22 o posterior) se maneja desde `app/`:

- `npm install`: instala las dependencias de todos los paquetes.
- `npm test`: ejecuta todas las pruebas (Vitest). `npm run typecheck` comprueba los tipos.
- `npm run dev`: arranca servidor e interfaz en `http://localhost:3000` (cambia el puerto con `PORT`). Imprime también la dirección en la red local, que es la que hay que abrir desde un móvil.
- `npm run build` y después `npm start`: compila la interfaz y arranca el servidor en modo producción.

Paquetes de `app/packages/`:

| Paquete | Contenido |
| --- | --- |
| `engine` | Motor de reglas puro (ADR-0002). Sin red, sin interfaz, sin `Date.now` ni azar sin inyectar. |
| `protocol` | Mensajes entre cliente y servidor y utilidades del código de sala. Sin reglas del juego. |
| `server` | Servidor de salas: HTTP, websockets en `/ws`, salas en memoria con caducidad (ADR-0001, 0003, 0006). |
| `client` | Interfaz en React con Vite. En desarrollo la sirve el propio servidor, en el mismo puerto. |

## Privacidad

No incluyas nombres ni datos de estudiantes o miembros de tribunales en issues, registros, pruebas ni datos de ejemplo.
