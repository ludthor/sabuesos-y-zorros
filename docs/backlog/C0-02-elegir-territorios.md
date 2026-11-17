---
id: C0-02
titulo: Elegir los territorios en juego
corte: C0
estado: en curso
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
- Decisiones de Ariel (2026-11-17):
  - Con justo 20, 30 o 40 minutos se aplica el tramo menor: 3, 4 o 5 territorios. La tabla del §7 ya lo dice así.
  - Los territorios los eligen y la partida la empieza cualquier dispositivo de los sabuesos, porque «el tribunal decide» (§3.4). Los zorros ven la selección, pero no la cambian.
  - Para empezar hace falta al menos un dispositivo de los zorros en la sala, porque son ellos quienes eligen el primer territorio.
- Mientras no se toque nada, se juegan los seis territorios (decisión de C0-03). Para empezar, el número de territorios marcados tiene que coincidir con el número elegido.
- Al empezar la partida ya no se puede cambiar de bando (decisión de C0-03).
