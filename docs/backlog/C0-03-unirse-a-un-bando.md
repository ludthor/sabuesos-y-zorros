---
id: C0-03
titulo: Unirse a un bando
corte: C0
estado: hecha
reglamento: "§1, §3.4, §4.3, §6.4"
depende_de: [C0-01]
---

# C0-03 · Unirse a un bando

Como zorro o sabueso, quiero unirme a la sala con el código y elegir mi bando para ver el tablero en mi dispositivo.

## Criterios de aceptación

- Dado un código válido, cuando elijo bando, entonces veo los territorios en juego y el marcador.
- Dado dos dispositivos en redes distintas (por ejemplo, eduroam y datos móviles), cuando uno cambia el estado, entonces el otro lo muestra en menos de un segundo.

## Notas

- Desde aquí se aplica la línea gráfica (ADR-0007): cada bando reconoce su color y su animal en la pantalla.
- Decisiones de Ariel (2026-11-17):
  - Hasta que llegue C0-02 se juegan los seis territorios del §6.4, leídos de `cartas/cartas.csv`. C0-02 permitirá quitar algunos.
  - El dispositivo que crea la sala también elige bando, como los demás.
  - Mientras la partida no ha empezado, un dispositivo puede cambiar de bando.
- Un bando puede tener varios dispositivos. El tablero muestra cuántos hay en cada uno.
- En este corte, el único cambio de estado es que un dispositivo elija o cambie de bando. La prueba automática mide el retraso entre dos clientes; la prueba entre redes distintas se hace en la demo.

## Para la demo

Con `npm run dev` en el portátil y el móvil en la misma red:

1. En el portátil, «Nueva partida». Debajo del QR aparece «¿De qué bando es este dispositivo?». Elegir «Sabuesos»: se ven los seis territorios con su pregunta guía, el marcador a 0 y «1 dispositivo» en los sabuesos.
2. En el móvil, escanear el QR y elegir «Zorros». En menos de un segundo, el portátil muestra «1 dispositivo» en los zorros.
3. En el móvil, «Pasar a los sabuesos». El portátil muestra 0 en los zorros y 2 en los sabuesos.
4. Cerrar la pestaña del móvil. El portátil baja a 1 dispositivo.
5. Comprobar que cada pantalla reconoce su bando por el color, el nombre y el animal.
6. El criterio de redes distintas (eduroam y datos móviles) necesita la dirección de pruebas de C0-06. Hasta entonces se prueba en la misma red.
