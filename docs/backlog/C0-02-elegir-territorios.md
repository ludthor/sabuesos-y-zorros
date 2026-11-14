---
id: C0-02
titulo: Elegir los territorios en juego
corte: C0
estado: lista
reglamento: "§3.4, §7"
depende_de: [C0-01]
---

# C0-02 · Elegir los territorios en juego

Como organizador, quiero elegir cuántos territorios se juegan y cuáles para ajustar la partida al tiempo de preguntas.

## Criterios de aceptación

- Dado el tiempo de preguntas que indico, entonces la app sugiere el número de territorios de la tabla del §7, y puedo cambiarlo entre 3 y 6.
- Dado que elijo los territorios, entonces solo puedo marcar los seis del §6.4, sin repetir.
- Dado que la configuración está completa, cuando empieza la partida, entonces los zorros eligen el primer territorio en disputa.

## Notas

- Los nombres y preguntas guía de los territorios salen de `cartas/cartas.csv` (filas de tipo `territorio`), no del código.
