---
name: engine-test-writer
description: Usar al agregar o modificar lógica en packages/engine para generar tests Vitest que cubran el comportamiento nuevo, incluyendo casos límite propios de Regicide (daño exacto, mazo vacío, combos al límite, poder de palo bloqueado por el enemigo). Correr los tests con pnpm --filter @regicide/engine test.
---

# Tests para packages/engine

## Cuándo usar esta skill

Después de escribir o modificar cualquier función en `packages/engine`, antes de dar la tarea por terminada.

## Casos límite que siempre hay que cubrir (cuando aplican a la función tocada)

- Daño que deja al enemigo en exactamente 0 de vida (kill exacto).
- Combo de cartas del mismo número que suma exactamente 10 vs. que se pasa de 10 (debe rechazarse).
- Poder de palo bloqueado porque coincide con el palo del enemigo actual.
- Contraataque que el jugador no puede cubrir con su mano → debe disparar derrota, no un estado intermedio.
- Mazo de robo vacío en el momento de tener que robar.
- Transición de un enemigo derrotado al siguiente (reset de vida/ataque del nuevo enemigo, el efecto de ♠ del enemigo anterior no debe persistir).
- Último Rey derrotado → condición de victoria.

## Instrucciones

1. Ubicar el archivo de test espejando la ruta de `src/` bajo `test/` (convención actual del repo: `packages/engine/test/`, un `*.test.ts` por módulo de `src/`).
2. Un `describe` por función/módulo, un `it` por caso de comportamiento (no por línea de código).
3. Los tests de reglas ambiguas (ver skill `regicide-rules-check`) deben dejar explícito en el nombre del test qué se está asumiendo, ej: `it('asume que el Joker descarta y redibuja la mano completa (TODO: confirmar)', ...)`.
4. Correr `pnpm --filter @regicide/engine test` antes de reportar la tarea como terminada.
5. Respetar los umbrales de cobertura configurados en `packages/engine/vitest.config.ts` (≥90% líneas/funciones/sentencias, ≥85% ramas).
