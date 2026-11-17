---
id: C0-03
titulo: Unirse a un bando
corte: C0
estado: en curso
reglamento: "§1"
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
