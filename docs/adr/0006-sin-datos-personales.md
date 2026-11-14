# ADR-0006 · Ningún dato personal en el servidor

Estado: aceptada (2026-11-14)

## Contexto

El juego se usa con estudiantes y tribunales. El reglamento dice que el marcador nunca se traduce en nota, y un registro de resultados en un servidor invitaría a usarlo como tal. Además, guardar datos de estudiantes exige cumplir la normativa de protección de datos.

## Decisión

- No hay cuentas de usuario.
- La sala guarda solo el estado de la partida y caduca tras un periodo sin actividad (propuesta inicial: 4 horas, se confirma en C0-01).
- Los nombres que se escriban para identificar a los jugadores, si los hay, viven solo en la sala y desaparecen con ella.
- El registro de la partida de prueba (historia C1-05) se descarga en el dispositivo del organizador y no se guarda en el servidor.

## Consecuencias

- No hay historial de partidas en el servidor. Las estadísticas acumuladas (nevera del backlog) tendrían que venir de registros que los organizadores compartan voluntariamente.
- Los registros técnicos del servidor no deben incluir el contenido de las salas.
