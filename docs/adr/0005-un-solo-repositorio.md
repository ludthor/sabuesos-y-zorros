# ADR-0005 · La app vive en este repositorio

Estado: aceptada (2026-11-14)

## Contexto

Las cartas existen en papel y en pantalla. Si cada versión tuviera su propia copia de los textos, acabarían diciendo cosas distintas.

## Decisión

La versión digital se desarrolla en este mismo repositorio, en `app/`. Lee las cartas de `cartas/cartas.csv`, el mismo archivo que usa `herramientas/generar_cartas.py`. Las instrucciones para agentes viven en `CLAUDE.md`, las historias en `docs/backlog/` y las decisiones en `docs/adr/`.

## Consecuencias

- Un cambio en una carta se hace una vez y llega al PDF y a la app.
- Una prueba de la app compara el CSV con el número de copias del reglamento (historia C2-01).
- El repositorio mezcla contenido del juego y código; las licencias se separan por carpetas (ADR-0008).
