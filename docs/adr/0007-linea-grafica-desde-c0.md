# ADR-0007 · Línea gráfica desde el primer corte

Estado: aceptada (2026-11-14)

## Contexto

Cada corte termina en una partida real con jugadores. Una interfaz provisional cambiaría la experiencia que se está probando y obligaría a rehacer pantallas después.

## Decisión

Desde C0 la interfaz usa la línea gráfica pop geométrico, definida como variables reutilizables:

| Uso | Color |
| --- | --- |
| Sabuesos | azul cobalto `#2747D6` |
| Zorros | naranja `#FF6A2B` |
| Territorios | amarillo `#FFC93C` |
| Texto | tinta `#141414` |
| Fondo | crema `#FFF4E6` |

Tipografía: Bricolage Grotesque, desde `fuentes/` (licencia SIL OFL 1.1).

## Consecuencias

- Las pantallas de cada corte se parecen ya al producto final.
- El color nunca es la única señal de bando: va acompañado de texto o de la silueta del animal, por accesibilidad.
