---
id: C2-03
titulo: Mano común oculta
corte: C2
estado: lista
reglamento: "§3.6"
depende_de: [C2-02, C0-03]
---

# C2-03 · Mano común oculta

Como zorro, quiero ver la mano de mi bando sin que el tribunal pueda verla para decidir con mi equipo qué jugar.

## Criterios de aceptación

- Dado el inicio de la partida, entonces los sabuesos reciben 3 cartas (con 1 a 3 sabuesos) o 4 (con 4 o 5) y los zorros 3.
- Dado varios dispositivos del mismo bando, entonces todos muestran la misma mano.
- Dado un dispositivo de los zorros, entonces el servidor no le envía ninguna carta de la mano de los sabuesos, y al revés. Se comprueba con una prueba sobre la vista que envía el servidor y revisando el tráfico real.

## Notas

- Es la historia que pone a prueba ADR-0001.
