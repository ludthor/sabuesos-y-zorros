---
id: C2-04
titulo: Jugar una carta
corte: C2
estado: lista
reglamento: "§4.2"
depende_de: [C2-03]
---

# C2-04 · Jugar una carta

Como jugador, quiero jugar una carta de la mano de mi bando para que todos la vean en grande mientras la leo en voz alta.

## Criterios de aceptación

- Dado una carta de mi mano, cuando la toco y confirmo, entonces aparece en grande en el tablero de todos los dispositivos con su texto completo.
- Dado que mi bando ya ha jugado una carta en esta pregunta, entonces el resto de su mano aparece atenuada hasta que se anote la pregunta.
- Dado que dos dispositivos del mismo bando juegan a la vez, entonces solo se acepta la primera carta y el otro recibe un aviso.

## Notas

- En este corte la app no comprueba el momento de la carta; eso llega en C3.
