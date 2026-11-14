---
id: C0-01
titulo: Crear una sala
corte: C0
estado: en curso
reglamento: "—"
depende_de: []
---

# C0-01 · Crear una sala

Como organizador, quiero crear una sala y obtener un código y un QR para que los dos bandos se unan sin crear cuentas.

## Criterios de aceptación

- Dado la página de inicio, cuando pulso «Nueva partida», entonces veo un código corto y un QR que lleva a la sala.
- Dado un código que no existe, cuando alguien lo introduce, entonces ve un aviso y no entra en ninguna sala.
- Dado una sala sin actividad durante el periodo de caducidad, entonces el servidor la elimina con todo su estado.

## Notas

- Es la primera historia de código: crea `app/` siguiendo ADR-0001, ADR-0002 y ADR-0003, con el motor de reglas, el servidor y el cliente como piezas separadas.
- Añade a `CLAUDE.md` los comandos para instalar, probar y arrancar la app.
- Caducidad: 4 horas sin actividad (ADR-0006). Confirmada por Ariel el 2026-11-14.
- El código evita caracteres que se confunden al dictarlo en voz alta (por ejemplo, 0 y O, 1 e I).
