# ADR-0002 · TypeScript en cliente y servidor, con un motor de reglas compartido

Estado: aceptada (2026-11-14)

## Contexto

Las reglas del juego deben vivir en un solo sitio y estar probadas. El cliente necesita conocerlas para mostrar qué cartas se pueden jugar; el servidor, para aplicarlas. Se valoró un servidor en Python con FastAPI, que obligaría a duplicar los tipos del estado y parte de la lógica en dos lenguajes.

## Decisión

Cliente y servidor se escriben en TypeScript. El motor de reglas es un paquete propio, sin entrada ni salida: recibe un estado y una acción y devuelve el estado nuevo o un error. Lo usan el servidor (para aplicar) y el cliente (para anticipar qué está permitido).

## Consecuencias

- Los tipos del estado, las acciones y las cartas se definen una vez.
- El motor se prueba sin red ni interfaz, lo que facilita escribir primero las pruebas de cada criterio.
- La estructura concreta de `app/` (paquetes, herramientas de compilación y de pruebas) la fija la historia C0-01 y se documenta en `CLAUDE.md`.
