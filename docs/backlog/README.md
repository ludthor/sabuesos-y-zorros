# Backlog de la versión digital (modo ensayo)

La versión digital se construye en nueve cortes verticales. Cada corte termina en algo que se puede jugar y se cierra con una partida de ensayo real; lo que se aprende en ella reordena el backlog antes del corte siguiente. Las historias de los tres primeros cortes están detalladas. Las demás solo tienen su intención y se detallan cuando su corte sea el siguiente.

## Método

- Una historia es una rama y una solicitud de cambio, y la cierra un agente en una sesión.
- Las pruebas de los criterios se escriben antes que el código.
- Un agente distinto, `revisor`, revisa cada historia sin haber visto su desarrollo.
- Las dudas de reglas se preguntan a Ariel y la respuesta se escribe en el reglamento o en la historia.
- Las reglas de trabajo completas, la lista para empezar y la definición de hecha están en [`CLAUDE.md`](../../CLAUDE.md).

## Estados

| Estado | Significa |
| --- | --- |
| `esbozo` | Solo tiene la intención; falta detallarla |
| `lista` | Detallada, con criterios verificables; puede empezar cuando sus dependencias estén hechas |
| `en curso` | Un agente trabaja en ella |
| `en revisión` | El revisor la aprobó; falta que Ariel la acepte |
| `hecha` | Aceptada por Ariel |

## Formato de una historia

Cada historia es un archivo `<id>-<slug>.md`:

```markdown
---
id: C1-02
titulo: Límite de cinco preguntas
corte: C1
estado: lista
reglamento: "§4.3"
depende_de: [C0-04]
---

# C1-02 · Límite de cinco preguntas

Como secretario, quiero que el territorio se cierre solo al llegar a cinco preguntas
para no tener que contar.

## Criterios de aceptación

- Dado …, cuando …, entonces …

## Notas
```

## Mapa de cortes

| Etapa | Corte | Al terminar |
| --- | --- | --- |
| 1 · Árbitro digital, con el kit impreso | C0 · Esqueleto andante | Dos dispositivos comparten un tablero y el secretario lleva el marcador |
| | C1 · Árbitro completo | Límite de preguntas, desempates, elección de territorio, tiempos, reconexión y registro exportable |
| 2 · Mesa digital, sin cartas impresas | C2 · Manos digitales | Mazos desde el CSV, mano común oculta por bando, jugar, descartar y robar |
| | C3 · Turno guiado | Los ocho pasos de cada pregunta, cartas jugables según el momento y valoración con la rúbrica |
| | C4 · Efectos de las cartas | Temporizadores automáticos, anulaciones, preguntas sin efecto y valoraciones conjuntas |
| | C5 · Roles del tribunal | Reparto de roles y habilidades de presidente, secretario, vocal y supervisor |
| 3 · Ensayo ampliado | C6 · Cierre | Consejos guardados, guion del cierre y resumen para los zorros |
| | C7 · Proyección y móviles | Vista pública, espectadores y varios móviles por bando |
| | C8 · Ensayo a distancia | Partida con videollamada y sala estable |

Hito 1, al cerrar la etapa 1: el árbitro digital ya se usa y mide las partidas de prueba. Hito 2, al cerrar la etapa 2: un ensayo completo se juega sin cartas impresas y con todas las reglas.

## Historias detalladas

| ID | Historia | Estado | Depende de |
| --- | --- | --- | --- |
| [C0-01](C0-01-crear-sala.md) | Crear una sala | en revisión | — |
| [C0-02](C0-02-elegir-territorios.md) | Elegir los territorios en juego | lista | C0-01 |
| [C0-03](C0-03-unirse-a-un-bando.md) | Unirse a un bando | lista | C0-01 |
| [C0-04](C0-04-anotar-preguntas.md) | Anotar quién gana cada pregunta | lista | C0-02, C0-03 |
| [C0-05](C0-05-final-de-partida.md) | Final de la partida | lista | C0-04 |
| [C0-06](C0-06-direccion-de-pruebas.md) | Dirección de pruebas | lista | C0-01 |
| [C1-01](C1-01-el-que-pierde-elige.md) | El que pierde elige territorio | lista | C0-04 |
| [C1-02](C1-02-limite-de-cinco-preguntas.md) | Límite de cinco preguntas | lista | C0-04 |
| [C1-03](C1-03-temporizador.md) | Temporizador | lista | C0-03 |
| [C1-04](C1-04-volver-a-la-sala.md) | Volver a la sala | lista | C0-03 |
| [C1-05](C1-05-registro-de-partida.md) | Registro de la partida de prueba | lista | C0-05 |
| [C1-06](C1-06-rubrica-a-la-vista.md) | Rúbrica y pregunta guía a la vista | lista | C0-04 |
| [C2-01](C2-01-cartas-desde-csv.md) | Cartas desde cartas.csv | lista | C0-06 |
| [C2-02](C2-02-mazos-segun-configuracion.md) | Mazos según la configuración | lista | C2-01 |
| [C2-03](C2-03-mano-comun-oculta.md) | Mano común oculta | lista | C2-02, C0-03 |
| [C2-04](C2-04-jugar-una-carta.md) | Jugar una carta | lista | C2-03 |
| [C2-05](C2-05-robar-hasta-completar.md) | Robar hasta completar | lista | C2-04 |
| [C2-06](C2-06-retirar-carta.md) | Retirar una carta jugada por error | lista | C2-04 |

## Historias en esbozo

| ID | Historia | Reglamento |
| --- | --- | --- |
| C3-01 | El mando muestra los ocho pasos de la pregunta; el secretario avanza y todos ven en qué paso se está | §4.2 |
| C3-02 | Solo se iluminan las cartas cuyo momento corresponde al paso actual; pasar cuesta un toque | §4.2 pasos 2–5 |
| C3-03 | Si los zorros jugaron en el paso 2 no juegan en el 4; si los sabuesos jugaron en el 3 no reaccionan en el 5 | §4.2 |
| C3-04 | Los sabuesos eligen quién pregunta y la app sugiere el siguiente de la rotación | §4.2 paso 1 |
| C3-05 | Quien valora elige satisfactoria, no satisfactoria o duda; la duda va a los zorros | §4.2 paso 7, §6.4 |
| C4-01 | Lazo de tiempo, El dibujante, Madriguera, Instinto salvaje y Rastro documental arrancan su temporizador al jugarse | §6.1, §6.2 |
| C4-02 | Hueso duro de roer anula la última carta de supervivencia; Hermandad anula Olfato aguzado | §6.1, §6.2 |
| C4-03 | Perro viejo y sabio, Concesión y Ciego pero con instinto ofrecen las salidas que indica su texto | §4.3, §6 |
| C4-04 | Colmillo encadenado, Perro viejo y desconfiado y Jauría feroz esperan a la segunda intervención antes de valorar | §6.1 |
| C4-05 | Instinto salvaje solo al empezar territorio; Silencio nocturno bloquea al sabueso elegido; Olfato aguzado excluye a quien respondió antes | §6.1, §6.2 |
| C4-06 | Pregunta temida pide valorar primero la pertinencia y después la respuesta | §6.2 |
| C5-01 | Los roles se reparten según el tamaño del tribunal, con el supervisor como sabueso | §6.3, §7 |
| C5-02 | Cada vocal elige un territorio distinto y su bando roba una carta extra cuando pregunta en él | §6.3 |
| C5-03 | El presidente anula una carta de cualquier bando una vez por partida | §6.3 |
| C5-04 | El secretario usa «Que conste en acta» una vez por territorio | §6.3 |
| C6-01 | Al jugar Perro viejo y sabio, el secretario puede apuntar el consejo en una línea | §5 |
| C6-02 | La pantalla de cierre muestra los territorios con sus fichas y guía los tres pasos | §5 |
| C6-03 | Los zorros apuntan qué territorio les costó más y qué harían distinto | §5 |
| C6-04 | Los zorros descargan un resumen con territorios, consejos y su reflexión, sin nota | §1, §5 |
| C7-01 | Vista pública para proyector, sin manos, legible desde el fondo de un aula | — |
| C7-02 | Espectadores que se unen por QR y solo ven la vista pública | — |
| C7-03 | Un miembro del bando propone una carta, el resto la ve marcada y cualquiera la confirma | §3 |
| C7-04 | Cada dispositivo elige qué vistas muestra: tablero, mano, mando | — |
| C8-01 | Partida con cada bando en un lugar distinto y la vista pública compartida en la videollamada | — |
| C8-02 | La sala se recupera si el servidor se reinicia durante la sesión | — |
| C8-03 | Los temporizadores se sincronizan con la hora del servidor para que la latencia no los desvíe | §2 |

## Nevera

Ideas sin prioridad, que pueden entrar al backlog tras una partida de prueba:

- Voto secreto de los sabuesos al valorar. Cambia quién decide, así que antes necesita una decisión de reglas.
- Variante a cartas vistas para jugar en una sola pantalla. Depende de cómo salga la prueba con el kit impreso.
- Modo tribunal.
- Catalán e inglés.
- Accesibilidad: lector de pantalla, alto contraste y tamaño de letra ajustable.
- Estadísticas acumuladas de las partidas de prueba (cartas más jugadas, territorios más largos).

## Decisiones de reglas tomadas durante el backlog

| Fecha | Decisión | Dónde |
| --- | --- | --- |
| 2026-11-14 | Las preguntas que no cuentan para ningún bando también suman al límite de cinco preguntas por territorio | Reglamento §4.3, C1-02 |
| 2026-11-14 | Retirar una carta jugada por error es solo una ayuda de la versión digital; no cambia el reglamento | C2-06 |
