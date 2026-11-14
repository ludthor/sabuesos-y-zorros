---
id: C1-05
titulo: Registro de la partida de prueba
corte: C1
estado: lista
reglamento: "—"
depende_de: [C0-05]
---

# C1-05 · Registro de la partida de prueba

Como diseñador del juego, quiero descargar al final un registro con la hora de cada evento para medir duración por territorio y número de preguntas.

## Criterios de aceptación

- Dado una partida terminada, cuando pulso «descargar registro», entonces obtengo un CSV con un evento por fila: hora, tipo, territorio y bando.
- El CSV incluye un resumen por territorio con las columnas de la tabla «Por territorio» de `docs/hoja-de-observacion.md`: territorio, preguntas, minutos y ganador.
- El registro se guarda solo en el dispositivo del organizador y no contiene nombres de personas (ADR-0006).

## Notas

- La columna «cartas jugadas» de la hoja de observación se añadirá cuando las cartas sean digitales (C2).
