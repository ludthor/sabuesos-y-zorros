# ADR-0003 · Websockets a través de un servidor de salas

Estado: aceptada (2026-11-14)

## Contexto

Los dispositivos de una partida deben ver los cambios casi al instante. En las redes universitarias, como eduroam, los dispositivos conectados a la misma wifi no suelen poder comunicarse directamente.

## Decisión

Cada dispositivo abre un websocket con el servidor y se une a una sala mediante un código. El servidor reenvía a cada dispositivo su vista del estado tras cada cambio. No hay conexiones directas entre dispositivos.

## Consecuencias

- Funciona igual en la misma sala, en redes distintas o a distancia (corte C8).
- El servidor debe soportar conexiones persistentes, lo que condiciona el alojamiento (ADR-0004).
- Los clientes deben reconectarse solos cuando el móvil se bloquea o cambia de red (historia C1-04).
