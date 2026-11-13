# Cómo contribuir

Gracias por tu interés en Sabuesos y Zorros. El juego está en fase beta y lo que más necesita es pasar por mesas reales.

## Informes de partida

Si has jugado una partida, cuéntalo abriendo un issue con la plantilla **Informe de partida**. La [hoja de observación](docs/hoja-de-observacion.md) te ayuda a recoger los datos durante el juego. Lo más útil es:

- El contexto: nivel (grado, máster, doctorado), tipo de proyecto y si era ensayo o defensa real.
- Cuánto duró cada territorio y qué cartas se jugaron o nunca se usaron.
- Qué reglas generaron dudas.
- Cómo se sintieron los jugadores de cada bando.

No incluyas nombres ni datos personales de estudiantes ni de miembros del tribunal.

## Proponer o cambiar cartas

Abre un issue con la plantilla **Propuesta de carta**. Explica qué problema de la partida resuelve la carta y en qué momento se juega. Si prefieres proponer el cambio directamente:

1. Edita `cartas/cartas.csv`. Mantén el formato de las columnas y usa un `id` nuevo (C13, S11…).
2. Si cambia alguna regla, actualiza `docs/reglamento.md`.
3. Regenera los PDF con `python3 herramientas/generar_cartas.py`.
4. Abre un pull request que explique el cambio.

## Traducciones

Las traducciones son bienvenidas. Para una nueva lengua, crea `cartas/cartas.<código>.csv` (por ejemplo, `cartas.en.csv`) y `docs/reglamento.<código>.md`, y conserva los mismos `id` de las cartas.

## Estilo de los textos

- Las cartas van en tercera persona ("los zorros", "el sabueso") para que valgan en todas las variantes del español.
- Frases cortas y concretas. Una carta debe entenderse sin consultar el reglamento.

## Licencia de las contribuciones

Al contribuir, aceptas que tu aportación se publique con la misma licencia que la parte del repositorio que modificas: CC BY 4.0 para el contenido del juego y MIT para el código.

## Convivencia

Este proyecto trata de hacer las defensas más justas y menos intimidantes. Pedimos el mismo trato en las conversaciones del repositorio: respeto, crítica centrada en las ideas y paciencia con quien empieza.
