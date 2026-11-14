---
id: C0-01
titulo: Crear una sala
corte: C0
estado: en revisión
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

## Para la demo

Con un portátil y un móvil en la misma wifi. En redes como eduroam los dispositivos no suelen verse entre sí; para eso está la dirección de pruebas de C0-06.

1. En el portátil: `cd app && npm install && npm run dev`. La consola muestra la dirección de la red local, por ejemplo `http://192.168.1.137:3000`.
2. En el portátil, abrir `http://localhost:3000` y pulsar «Nueva partida». Aparecen un código de 5 caracteres y un QR, y la dirección cambia a `/sala/<código>`.
3. En el móvil, escanear el QR. Entra en la misma sala y muestra el mismo código.
4. En el móvil, volver al inicio y escribir el código en minúsculas, o con un espacio o un guion. Entra en la sala.
5. En el móvil, escribir un código inventado, por ejemplo `ZZZZZ`. Aparece el aviso «No hay ninguna sala con el código ZZZZZ» y no entra.
6. Parar el servidor (Ctrl+C) con la sala abierta en el móvil. Aparece el aviso de conexión perdida. Al arrancarlo de nuevo y recargar, la sala ya no existe, porque las salas viven en memoria.

La caducidad de 4 horas no se prueba a mano: la cubren las pruebas automáticas.
