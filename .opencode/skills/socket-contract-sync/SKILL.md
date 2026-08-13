---
name: socket-contract-sync
description: Usar al agregar o modificar cualquier evento, payload o estado de sala de Socket.io entre apps/web y apps/server, para que ambos lados y packages/engine se mantengan sincronizados sin duplicar tipos.
---

# Contrato de eventos Socket.io (modo online)

## Cuándo usar esta skill

Cualquier cambio a: eventos emitidos/escuchados por cliente o servidor, forma del payload de una jugada, ciclo de vida de una sala (crear, unirse, desconexión, reconexión).

## Instrucciones

1. Los tipos de los eventos y sus payloads viven en un único lugar compartido (exportados desde `packages/engine` o, si crecen mucho, un `packages/shared` nuevo) — nunca se redefinen por separado en `apps/web` y `apps/server`.
2. Convención de nombres de eventos: `namespace:accion`, ej. `room:create`, `room:join`, `game:play-card`, `game:state-sync`. Mantener consistencia con eventos ya existentes antes de inventar uno nuevo.
3. Todo payload de jugada que viaje por socket debe poder validarse con las funciones puras de `packages/engine` — el server no debe tener su propia copia de "qué jugadas son válidas".
4. Al agregar un evento nuevo, actualizar en la misma tarea: el emisor (web o server), el listener del otro lado, y el tipo compartido. No dejar un evento "emitido pero no escuchado" o viceversa.
5. Para reconexión: el server debe poder reconstruir el estado de la sala a partir de lo que ya tiene en memoria y reenviarlo entero al cliente que se reconecta (`game:state-sync`), en vez de intentar reproducir eventos históricos.
