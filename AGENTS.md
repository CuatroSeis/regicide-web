# AGENTS.md — Contexto del proyecto

> Archivo de contexto para retomar el trabajo en cualquier sesión. Leer antes de codear.

## Proyecto

**Regicide (regicide-web)** — juego de cartas cooperativo fan-made (reglas de *Regicide*, sin afiliación con Badgers From Mars).

- **Ubicación**: `/home/rufino/Desktop/REGICIDIO ONLINE`
- **Repo**: GitHub `CuatroSeis/regicide-web`, branch `main`
- **Stack** (NO cambiar):
  - `packages/engine` — TS puro con las reglas (lógica de turnos, combate, mazos, snapshots).
  - `apps/web` — React 19 + Vite + framer-motion + socket.io-client.
  - `apps/server` — socket.io + sirve el build estático de la web (deploy single-origin).

## Comandos

```bash
pnpm typecheck                 # tsc en todos los paquetes
pnpm lint                      # eslint
pnpm --filter @regicide/server test    # vitest (20 tests)
pnpm --filter @regicide/web build      # genera apps/web/dist
pnpm --filter @regicide/server start   # server local en :3001 (tsx)
pnpm --filter @regicide/web dev        # Vite dev en :5173
```

## Deploy

- **Un solo servicio en Render** (`render.yaml` en la raíz), auto-deploy en cada push a `main`.
- **URL**: https://regicide-web.onrender.com/
- El server sirve `apps/web/dist` (build estático) + socket.io en el mismo origen (sin CORS).
- **Cuidado**: `io.httpServer.listen(port)` y NUNCA `io.listen(number)` (crea un server 404).
- **Render free tier**: duerme con inactividad (cold start ~30-60 s, acks lentos al arrancar). No confundir con bugs. Salas en memoria (se pierden al reiniciar).

## Estado actual (V1 + V2, en producción)

- Multijugador online funcional: crear sala, unirse (2-4), empezar, jugar/rendirse/cubrir daño/Jester, rejoin tras recargar la pestaña.
- Bugs resueltos recientemente (commit `4462186`):
  - **Pantalla en blanco al jugar**: `selectionValue` en `useOnlineGame.ts` hacía `cardValue(undefined)` (TypeError en render → React desmontaba todo, reportado vía `reportError`, invisible por CDP). Fix: ignorar ids que ya no están en la mano + `ErrorBoundary` en `main.tsx`.
  - **Auto-redirect tras recarga**: `App.tsx` lleva directo al tablero si hay sesión y la sala inició.
  - **Log con nombres** (antes mostraba UUID crudos).
  - **Rejoin endurecido**: `rejoinRoom(force)` evita la raza "Ya hay una conexión activa" en recargas rápidas.

## Arquitectura clave

- `apps/server/src/rooms.ts` — `RoomManager`: salas en memoria, `playerOrder`, `applyAction` valida "es tu turno".
- `apps/server/src/index.ts` — handlers socket: `room:create/join/rejoin/leave`, `game:start/play/yield/discard/play-jester`. `syncRoom` → `playerSnapshot` por jugador → emit `game:state-sync`. `withPlayerNames` reemplaza ids por nombres en el log. `socketByPlayerId` para enrutar estados.
- `packages/engine/src/net.ts` — `PublicGameState` / `PlayerGameState`. **Datos ya disponibles en cada snapshot**: `players`, `currentPlayerIndex`, `castleCount`, `tavernCount`, `discardPile`, `table`, `enemy`, `phase`, `consecutiveYields`, `jestersLeft`, `turnNumber`, `log`, `hand`, `isMyTurn`.
- `packages/engine/src/turn.ts` — reglas de turno (pasos 1-4, Jester R-20/21, rendirse R-9). Documentadas contra `docs/rules-source.md` (R-N).
- `apps/web/src/hooks/useOnlineGame.ts` — sesión en `sessionStorage`, `io()` same-origin, estado `selected`/`selectionValue`/`canPlay`/`canDiscard`.
- `apps/web/src/App.tsx` — navegación por `screen` (`home/room/rules/game/online-game`).
- `apps/web/src/screens/OnlineGameScreen.tsx` — tablero online (EnemyPanel, mesa, mano, controles, log).
- `apps/web/src/index.css` — todos los estilos (variables en `:root`; tipografía base `Georgia` serif).

## V2 (hecho)

Mejoras visuales y de legibilidad implementadas (commits `599cbc9`, `013c298`, `acbaa29`, `d3038aa`, `f0b32ad`):

- **Contadores de cartas en pantalla**: mazo (Taverna) y descarte (pilas) flanqueando al enemigo, con animación de "viaje" de las cartas jugadas.
- **Tipografía**: `Alegreya` (serif estilo carta) con `clamp()` responsivo en vez de Georgia; tamaños agrandados (vida, ataque, palo, daño recibido, barra de vida, turn indicator, phase-hint, log, labels).
- **Barra de vida** con color por umbral (verde → ámbar → rojo) y transición animada.
- **Feedback de daño recibido** por el enemigo: número flotante "−N" animado al atacar (campo `lastDamageDealt` agregado al snapshot en engine).
- **Panel del enemigo** más jerárquico (ataque y escudo ♠ prominentes), turn indicator en "pill" dorado, phase-hint con color según fase, log más legible.
- **Layout mobile compacto** a una pantalla (commit `d3038aa`).
- **Fix derrota en Paso 4** (`f0b32ad`): si la mano no alcanza a cubrir el ataque efectivo, la partida termina en derrota.

## V3 (pendiente)

### Derrota automática al quedarse sin cartas y sin Jester [R-25]
- **Problema**: si el jugador activo empezaba su turno con la mano vacía, en solo el juego nunca disparaba la derrota (en solo `canYield` siempre es `true`, así que `isStuck` jamás se activaba) y en multiplayer requería un clic extra en "Rendirse".
- **Solución (ya en código, falta desplegar)**: `isStuck` en `packages/engine/src/turn.ts` ahora se define como **mano vacía + sin Jester que rescate (solo: `jestersLeft === 0`; multiplayer: sin carta de Jester en mano) + ataque efectivo > 0** (si es 0, rendirse es seguro, R-19). Se dispara `checkStuck` de forma automática en:
  - inicio/fin de turno (`finishTurn`),
  - `playCards` al revelar el enemigo siguiente (R-18 iv),
  - `jesterSolo` (recarga con taverna vacía),
  - `playJester` (multiplayer).
- Cartel actualizado en `VictoryOverlay.tsx`: «Te quedaste sin cartas y sin Jester para continuar. El castillo gana. [R-25]».
- Ojo: los tests de `isStuck` (`turn.test.ts`) asumen la semántica nueva (mano vacía + ataque>0 = derrota automática, incluso si el jugador podría rendirse).

## Cómo verificar cambios

- Tras tocar web: `pnpm --filter @regicide/web build` y probar contra el server local en :3001 (el server sirve el build). Para el flujo online: 2 pestañas en `http://localhost:3001/`.
- Repro CDP headless disponible (Chrome con `--remote-debugging-port=9222`) para automatizar 2 pestañas (crear sala → unir → jugar → verificar estado).
- Para prod: push a `main` → Render auto-deploy → https://regicide-web.onrender.com/ (esperar cold start).
