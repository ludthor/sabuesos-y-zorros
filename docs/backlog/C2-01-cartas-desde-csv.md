---
id: C2-01
titulo: Cartas desde cartas.csv
corte: C2
estado: lista
reglamento: "§6"
depende_de: [C0-06]
---

# C2-01 · Cartas desde cartas.csv

Como diseñador del juego, quiero que la app lea las cartas del mismo `cartas/cartas.csv` que genera el kit impreso para que papel y pantalla digan lo mismo.

## Criterios de aceptación

- Dado el CSV actual, entonces la app tiene 25 cartas de cacería y 19 de supervivencia con nombre, copias, momento, marcas (`solo_ensayo`, `solo_grupo`) y texto idénticos.
- Dado un cambio en el CSV, cuando se publica una versión nueva, entonces la app muestra el texto cambiado.
- Una prueba falla si el CSV y el reglamento no coinciden en el número de copias.

## Notas

- Las 25 y 19 cartas se cuentan sumando la columna `copias`.
