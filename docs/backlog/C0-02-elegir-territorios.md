---
id: C0-02
titulo: Elegir los territorios en juego
corte: C0
estado: en revisión
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
- Duda abierta para Ariel (revisión de C0-02): si el único dispositivo de los zorros sale de la sala después de «Empezar la partida» y antes de elegir el primer territorio, la partida espera. Un dispositivo que entre puede elegir el bando de los zorros y continuar. ¿Basta así o debe volver a la preparación?

## Para la demo

Con `npm run dev` en el portátil y el móvil en la misma red:

1. En el portátil, «Nueva partida» y elegir «Sabuesos». Aparece «Preparar la partida» con los seis territorios marcados y el 6 elegido.
2. Escribir 25 en «Tiempo de preguntas (minutos)» y salir del campo: se sugieren 4 territorios y el 4 queda elegido. Probar también 20 (sugiere 3) y 40 (sugiere 5).
3. «Empezar la partida» está desactivado y explica que hay que marcar 4 territorios. Desmarcar dos: ahora explica que falta un dispositivo de los zorros.
4. En el móvil, escanear el QR y elegir «Zorros». Se ve que los sabuesos preparan la partida y cuántos territorios llevan marcados, pero no se puede cambiar nada. Los cambios del portátil aparecen en el móvil al momento.
5. En el portátil, «Empezar la partida». El móvil muestra «¿Por qué territorio se empieza?» con los cuatro territorios. El portátil muestra que eligen los zorros. Ya no aparece «Pasar a…» en ninguno de los dos.
6. En el móvil, tocar un territorio. Los dos dispositivos lo muestran «En disputa».
