---
name: regicide-rules-check
description: Usar antes de implementar o revisar cualquier regla del juego Regicide (combate, poderes de palo, combos, contraataque, condiciones de victoria/derrota, jokers). Verifica la mecánica contra docs/rules-source.md (fuente oficial del PDF de Badgers From Mars) en vez de asumir la interpretación más común de internet.
---

# Verificación de reglas contra la fuente oficial

## Cuándo usar esta skill

Cualquier tarea que toque `packages/engine` y modifique o agregue comportamiento de: daño, poderes de ♥♦♣♠, combos de cartas, contraataque enemigo, transición entre enemigos, condiciones de fin de partida, o el comportamiento de los Jokers.

## Instrucciones

1. Abrir `docs/rules-source.md` en la raíz del repo y localizar el fragmento de reglas relevante a la tarea actual (cada regla tiene un ID `[R-x]`).
2. Si la fuente resuelve la duda de forma explícita, implementar exactamente eso — citar el ID en un comentario corto en el código (`// Regla [R-7]: kill exacto va al tope de la Taverna`).
3. Si después de leer la fuente sigue habiendo ambigüedad:
   - Implementar la interpretación más simple y documentarla con `// TODO(regla-ambigua): <duda concreta, qué falta confirmar>`.
   - Escribir el test de esa mecánica de forma que sea fácil de ajustar cuando se confirme la regla (no hardcodear el valor ambiguo en múltiples lugares).
   - Mencionar explícitamente en la respuesta al usuario qué quedó pendiente de confirmar.
4. Nunca marcar una tarea de reglas como "completa" si quedó un TODO de este tipo sin que el usuario lo haya confirmado.

## Anti-patrón a evitar

No "rellenar" una regla ambigua combinando fragmentos de distintas versiones del juego (la versión con mazo oficial ilustrado difiere en detalles de la versión adaptada a mazo estándar de 52 cartas, que es la que usa este proyecto).
