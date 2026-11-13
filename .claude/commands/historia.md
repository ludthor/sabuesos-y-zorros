---
description: Desarrolla una historia del backlog de la versión digital (por ejemplo, /historia C0-01)
argument-hint: <id de la historia>
---

Vas a desarrollar la historia $ARGUMENTS siguiendo `CLAUDE.md`.

1. Lee `docs/backlog/$ARGUMENTS-*.md` y las secciones de `docs/reglamento.md` que cita. Si su estado no es `lista` o alguna dependencia no está `hecha`, detente y explica qué falta.
2. Escribe un plan de tres a cinco líneas y las dudas de reglas que veas. Si hay alguna duda, pregunta y espera la respuesta antes de escribir código.
3. Crea la rama `historia/$ARGUMENTS-<slug>` y cambia el estado de la historia a `en curso`.
4. Escribe primero las pruebas de cada criterio de aceptación y comprueba que fallan.
5. Implementa lo mínimo para que pasen. Ejecuta todas las pruebas.
6. Lanza el agente `revisor` con el identificador $ARGUMENTS. Resuelve lo que pida hasta que apruebe.
7. Cambia el estado a `en revisión`, añade a la historia una sección "Para la demo" con qué probar en dos dispositivos y resume el trabajo en un mensaje para Ariel.
