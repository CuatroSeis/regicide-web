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

## Estado actual (V1, en producción)

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

## V2 (pendiente)

### 1. Contadores de cartas en pantalla
- Mostrar en el tablero la cantidad de cartas del **mazo (Taverna)** y del **cementerio (descarte)**.
- Los datos YA vienen en el snapshot (`tavernCount`, `discardPile.length`; opcional `castleCount`), solo falta UI.
- Sugerencia: chips/counters cerca del `EnemyPanel` o en el header, estilados en `index.css`.

### 2. Tipografía y legibilidad
- Agrandar y cambiar la tipografía de los textos percibidos en pantalla: **vida, ataque, palo, daño recibido, barra de vida**, turn indicator, phase-hint, log, labels.
- Tamaños actuales (chicos) en `index.css`: `.health-label` 0.8rem, `.health-value` 0.85rem, `.stat` 0.85rem, `.enemy-name` 1.2rem, `.immunity` 0.8rem, `.turn-indicator` 1rem, `.phase-hint` 0.9rem, `.log-box` 0.8rem.
- Tipografía actual: `font-family: Georgia, Times New Roman, serif` (body). Proponer un font stack más legible/estilo carta, con `clamp()` responsivo.
- Archivos: `EnemyPanel.tsx`, `OnlineGameScreen.tsx`, `index.css`.

### 3. Mejoras visuales propuestas (sin cambiar stack)
- **Barra de vida** con color por umbral (verde → ámbar → rojo) y transición animada más visible.
- **Feedback de daño recibido** por el enemigo: número flotante "−N" animado al atacar (derivar el valor del log o agregar campo al snapshot).
- **Panel del enemigo** más jerárquico: ataque y escudo ♠ más prominentes.
- **Turn indicator** en formato "pill" dorado con fondo; **phase-hint** más grande y con color según fase.
- **Log** más legible (tamaño y espaciado; ya muestra nombres, no UUID).

## Cómo verificar cambios

- Tras tocar web: `pnpm --filter @regicide/web build` y probar contra el server local en :3001 (el server sirve el build). Para el flujo online: 2 pestañas en `http://localhost:3001/`.
- Repro CDP headless disponible (Chrome con `--remote-debugging-port=9222`) para automatizar 2 pestañas (crear sala → unir → jugar → verificar estado).
- Para prod: push a `main` → Render auto-deploy → https://regicide-web.onrender.com/ (esperar cold start).
