# ADR-0001 · El estado de la partida vive en el servidor

Estado: aceptada (2026-11-14)

## Contexto

Cada bando tiene una mano común que el otro bando no debe ver (reglamento, §3). Si el estado completo llegara a todos los dispositivos, bastaría con abrir las herramientas del navegador para ver la mano rival.

## Decisión

El servidor guarda el estado completo de cada sala y aplica todas las acciones. A cada dispositivo le envía una vista filtrada con lo que su bando puede ver: el tablero público y, como mucho, la mano de su propio bando.

## Consecuencias

- Los clientes nunca deciden el resultado de una acción; la proponen y el servidor la acepta o la rechaza.
- Hace falta una función de proyección del estado por bando, con pruebas que comprueben que no se filtra la mano ajena.
- Sin conexión con el servidor no se puede jugar. Un modo sin conexión queda fuera del alcance actual.
