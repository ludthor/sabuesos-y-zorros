# ADR-0008 · MIT para el código de la app, CC BY 4.0 para el contenido

Estado: aceptada (2026-11-14)

## Contexto

El repositorio ya separa las licencias por tipo de material (ver `LICENSE.md`): contenido del juego en CC BY 4.0, código de `herramientas/` en MIT y tipografía en SIL OFL 1.1. La app añade código nuevo y vuelve a usar contenido del juego.

## Decisión

- El código de `app/` se publica con licencia MIT, como el de `herramientas/`.
- Los textos de las cartas y del reglamento que la app muestra siguen bajo CC BY 4.0. La app muestra la atribución en su pantalla de créditos.
- La tipografía sigue bajo SIL OFL 1.1.

## Consecuencias

- `LICENSE.md` y el README incluyen `app/` en la fila del código.
- Las contribuciones a `app/` se aceptan bajo MIT, como indica `CONTRIBUTING.md`.
