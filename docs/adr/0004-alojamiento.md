# ADR-0004 · Alojamiento con websockets y coste bajo

Estado: aceptada (2026-11-14); proveedor por elegir en C0-06

## Contexto

La app necesita una dirección pública para las partidas de prueba. El uso previsto es pequeño: pocas salas a la vez, cada una de una o dos horas. El servidor debe aceptar websockets (ADR-0003).

## Decisión

Se aloja en un servicio que admita websockets y tenga un coste bajo o nulo para ese volumen. Al empezar la historia C0-06 se comparan dos o tres proveedores y se registra la elección en este ADR.

## Criterios para elegir

- Admite websockets y conexiones de varias horas.
- Despliega automáticamente desde la rama principal.
- Coste previsible con pocas salas simultáneas.
- Servidores en Europa, por latencia y protección de datos.

## Consecuencias

- Hasta C0-06 la app solo se prueba en local.
