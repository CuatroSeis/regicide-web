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
pnpm --filter @regicide/server test    # vitest (29 tests; +2 integración si hay DATABASE_URL)
pnpm --filter @regicide/engine test    # vitest (124 tests, coverage)
pnpm --filter @regicide/web test       # vitest + Testing Library (23 tests)
pnpm --filter @regicide/web build      # genera apps/web/dist
pnpm --filter @regicide/server start   # server local en :3001 (tsx)
pnpm --filter @regicide/web dev        # Vite dev en :5173
```

## Deploy

- **Un solo servicio en Render** (`render.yaml` en la raíz), auto-deploy en cada push a `main`.
- **URL**: https://regicide-web.onrender.com/
- El server sirve `apps/web/dist` (build estático) + socket.io en el mismo origen (sin CORS).
- **Cuidado**: `io.httpServer.listen(port)` y NUNCA `io.listen(number)` (crea un server 404).
- **Render free tier**: duerme con inactividad (cold start ~30-60 s, acks lentos al arrancar). No confundir con bugs. **Salas en memoria** (se pierden al reiniciar). La **tabla de posiciones persiste en Supabase** (`DATABASE_URL`, Postgres externo con `sync: false` en `render.yaml`), así que no se pierde en cold start/redeploy.

## Estado actual (V1 + V2, en producción)

- Multijugador online funcional: crear sala, unirse (2-4), empezar, jugar/rendirse/cubrir daño/Jester, rejoin tras recargar la pestaña.
- Bugs resueltos recientemente (commit `4462186`):
  - **Pantalla en blanco al jugar**: `selectionValue` en `useOnlineGame.ts` hacía `cardValue(undefined)` (TypeError en render → React desmontaba todo, reportado vía `reportError`, invisible por CDP). Fix: ignorar ids que ya no están en la mano + `ErrorBoundary` en `main.tsx`.
  - **Auto-redirect tras recarga**: `App.tsx` lleva directo al tablero si hay sesión y la sala inició.
  - **Log con nombres** (antes mostraba UUID crudos).
  - **Rejoin endurecido**: `rejoinRoom(force)` evita la raza "Ya hay una conexión activa" en recargas rápidas.

## Arquitectura clave

- `apps/server/src/rooms.ts` — `RoomManager`: salas en memoria, `playerOrder`, `applyAction` valida "es tu turno".
- `apps/server/src/leaderboard.ts` — tabla de posiciones: interfaz `LeaderboardStore` (`load`/`add`/`list`) + `FileLeaderboardStore` (JSON best-effort) + `PostgresLeaderboardStore` + factory `createLeaderboardStore()` (usa Postgres si existe `DATABASE_URL`). `parseScoreInput` valida/saneja el payload. Rutas API en `index.ts`.
- `apps/server/src/index.ts` — handlers socket: `room:create/join/rejoin/leave`, `game:start/play/yield/discard/play-jester`. `syncRoom` → `playerSnapshot` por jugador → emit `game:state-sync`. `withPlayerNames` reemplaza ids por nombres en el log. `socketByPlayerId` para enrutar estados. API HTTP: `GET /api/leaderboard`, `POST /api/scores`.
- `packages/engine/src/net.ts` — `PublicGameState` / `PlayerGameState`. **Datos ya disponibles en cada snapshot**: `players`, `currentPlayerIndex`, `castleCount`, `tavernCount`, `discardPile`, `table`, `enemy`, `phase`, `consecutiveYields`, `jestersLeft`, `turnNumber`, `log`, `hand`, `isMyTurn`.
- `packages/engine/src/turn.ts` — reglas de turno (pasos 1-4, Jester R-20/21, rendirse R-9). Documentadas contra `docs/rules-source.md` (R-N).
- `packages/engine/src/summary.ts` — `soloRank`/`gameSummary`/`SOLO_RANK_PRIORITY` (rangos para la tabla de posiciones).
- `apps/web/src/hooks/useOnlineGame.ts` — sesión en `sessionStorage`, `io()` same-origin, estado `selected`/`selectionValue`/`canPlay`/`canDiscard`.
- `apps/web/src/i18n/` — `translations.ts` (diccionario es/en/pt), `LanguageContext.tsx` (provider + `t()`), `LanguageSwitcher.tsx`. Todo texto visible sale de acá (`useLanguage`).
- `apps/web/src/screens/SetupScreen.tsx` — nombre + semilla de la partida 1p (asocia el resultado a la tabla). `LeaderboardScreen.tsx` — tabla con Nombre | Dónde murió | Jesters | Rango.
- `apps/web/src/lib/leaderboard.ts` — cliente `fetchLeaderboard`/`submitScore` contra `/api`.
- `apps/web/src/App.tsx` — navegación por `screen` (`home/setup/room/rules/leaderboard/game/online-game`). `MotionConfig reducedMotion="user"` en `AppWithMotion` (importado por `main.tsx`).
- `apps/web/src/screens/OnlineGameScreen.tsx` — tablero online (EnemyPanel, mesa, mano, controles, StepBanner con el registro dentro).
- `apps/web/src/index.css` — todos los estilos (variables en `:root`; tipografía base `Alegreya` serif; paleta fría Dark Fantasy — ver V4).

## V2 (hecho)

Mejoras visuales y de legibilidad implementadas (commits `599cbc9`, `013c298`, `acbaa29`, `d3038aa`, `f0b32ad`):

- **Contadores de cartas en pantalla**: mazo (Taverna) y descarte (pilas) flanqueando al enemigo, con animación de "viaje" de las cartas jugadas.
- **Tipografía**: `Alegreya` (serif estilo carta) con `clamp()` responsivo en vez de Georgia; tamaños agrandados (vida, ataque, palo, daño recibido, barra de vida, turn indicator, phase-hint, log, labels).
- **Barra de vida** con color por umbral (verde → ámbar → rojo) y transición animada.
- **Feedback de daño recibido** por el enemigo: número flotante "−N" animado al atacar (campo `lastDamageDealt` agregado al snapshot en engine).
- **Panel del enemigo** más jerárquico (ataque y escudo ♠ prominentes), turn indicator en "pill" dorado, phase-hint con color según fase, log más legible.
- **Layout mobile compacto** a una pantalla (commit `d3038aa`).
- **Fix derrota en Paso 4** (`f0b32ad`): si la mano no alcanza a cubrir el ataque efectivo, la partida termina en derrota.

## V3 (hecho)

### Derrota automática al quedarse sin cartas y sin Jester [R-25]
- **Problema**: si el jugador activo empezaba su turno con la mano vacía, en solo el juego nunca disparaba la derrota (en solo `canYield` siempre es `true`, así que `isStuck` jamás se activaba) y en multiplayer requería un clic extra en "Rendirse".
- **Solución (ya en código)**: `isStuck` en `packages/engine/src/turn.ts` ahora se define como **mano vacía + sin Jester que rescate (solo: `jestersLeft === 0`; multiplayer: sin carta de Jester en mano) + ataque efectivo > 0** (si es 0, rendirse es seguro, R-19). Se dispara `checkStuck` de forma automática en:
  - inicio/fin de turno (`finishTurn`),
  - `playCards` al revelar el enemigo siguiente (R-18 iv),
  - `jesterSolo` (recarga con taverna vacía),
  - `playJester` (multiplayer).
- Cartel actualizado en `VictoryOverlay.tsx`: «Te quedaste sin cartas y sin Jester para continuar. El castillo gana. [R-25]».
- Ojo: los tests de `isStuck` (`turn.test.ts`) asumen la semántica nueva (mano vacía + ataque>0 = derrota automática, incluso si el jugador podría rendirse).

### i18n (es/en/pt), tabla de posiciones y accesibilidad
- **i18n con React Context**: `apps/web/src/i18n/translations.ts` (diccionario `es`/`en`/`pt`, `TranslationKey` derivado de `es`, `interpolate` para `{param}`) + `LanguageContext.tsx` (provider, `useLanguage()`/`t()`, persiste `localStorage('regicide.lang')`, sincroniza `document.documentElement.lang`) + `LanguageSwitcher.tsx`. Todos los screens/components usan `t()`. **Limitación V3**: el `log` del engine y los acks de error del server quedan en español.
- Las claves con HTML (p. ej. `rulesStep1`) se renderizan con `dangerouslySetInnerHTML` (contenido propio estático, sin input de usuario).
- **Rango en solitario** (`packages/engine/src/summary.ts`): victoria → Oro/Plata/Bronce según Jesters usados (R-23); derrota → tier temático por enemigos derrotados: `peasant` 0-2, `squire` 3-5, `knight` 6-8, `baron` 9-11 (castillo = 12 enemigos, `CASTLE_ENEMY_COUNT`). `gameSummary(state)` acepta `GameState` o `PublicGameState` (tipo `SummarySource`).
- **Tabla de posiciones** (server-side, sin cuentas):
  - `apps/server/src/leaderboard.ts` — `LeaderboardStore` (memoria + persistencia JSON best-effort), `parseScoreInput` valida/saneja nombre ≤20, seed uint32, result, enemiesDefeated 0-12, jestersUsed 0-2, turnNumber ≥1, enemyCard. Orden: `SOLO_RANK_PRIORITY` desc → enemiesDefeated desc → turnNumber asc → createdAt. Límite `LEADERBOARD_MAX = 50`.
  - `apps/server/src/index.ts` — `GET /api/leaderboard?limit=50`, `POST /api/scores` (400 en payload inválido; **el server calcula el rango**, no confía en el cliente). `LEADERBOARD_FILE` env (default `apps/server/data/leaderboard.json`).
  - `apps/web/src/lib/leaderboard.ts` — `fetchLeaderboard`/`submitScore` (mismo origen `/api`, sin CORS). Vite proxy `/api` → :3001 (dev).
  - Flujo 1p: `SetupScreen` pide el nombre (prefill `localStorage('regicide.name')`) y genera la **semilla** = id único de la partida. `App.tsx` guarda `{name, seed}` y pasa `key={seed}` a `GameScreen` (remount al re-jugar). Al terminar, `GameScreen` hace `submitScore` (best-effort). `LeaderboardScreen` muestra Nombre | Dónde murió | Jesters | Rango (en derrota «{enemigo} · {N}/12»).
- **Accesibilidad**: `CardFan` como `<button>` con `aria-pressed` y teclado (tabIndex -1 si no es seleccionable); `:focus-visible` anillo dorado; `aria-live="polite"` en log/phase-hint/turn-indicator; overlays con `role="dialog"`+`aria-modal`+`aria-labelledby`; `MotionConfig reducedMotion="user"` + `@media (prefers-reduced-motion: reduce)`; landmarks (`<label htmlFor>`, tabla con `<th scope>`); `CardFace` con `aria-label` localizado; `ErrorBoundary` traducido vía `static contextType`.
- **Tests web** (vitest + jsdom + Testing Library): `pnpm --filter @regicide/web test` (23 tests). Infra: `vitest.config.ts` (jsdom, `src/test/setup.ts`), helper `src/test/renderWithLang.tsx` (los componentes usan `useLanguage`). Cobertura: paridad de claves y placeholders entre idiomas, `interpolate`, leaderboard (fetch mocado), accesibilidad de `CardFan`, HomeScreen (menú + switch de idioma), flujo de `SetupScreen`, LeaderboardScreen (filas, vacío, error).

**Caveat persistencia**: antes la tabla vivía en el disco efímero de Render y se perdía en cold start/redeploy. Desde V4 la persistencia real está en **Supabase** (ver V4); el JSON en disco solo queda como fallback cuando no hay `DATABASE_URL`.

## V4 (hecho)

Iteración visual + persistencia real de la tabla (commits `7ee999f`, `98132e6`, `265a4c2`):

### Persistencia de la tabla en Supabase (P0)
- `pg` + `@types/pg`. `PostgresLeaderboardStore` (pool max 3, tabla `scores`, `CREATE TABLE IF NOT EXISTS`, `types.setTypeParser(20, Number)` para int8). `seed` es **bigint** (uint32 no entra en int4). Orden SQL: CASE de rango (`gold` 7 … `peasant` 1) desc → enemies_defeated desc → turn_number asc → created_at asc, `LIMIT $1`.
- `createLeaderboardStore()`: si existe `DATABASE_URL` → Postgres; si no → `FileLeaderboardStore` (`LEADERBOARD_FILE`, default `apps/server/data/leaderboard.json`).
- `apps/server/.env` (gitignored) con la URI real (transaction pooler). Scripts `dev`/`start` usan `tsx --env-file-if-exists=.env src/main.ts`. `render.yaml` agrega `DATABASE_URL` con `sync: false`.
- Test de integración `apps/server/test/postgres.test.ts`: se salta sin `DATABASE_URL`; usa tabla `scores_it_<Date.now()>` y la dropea al final. Correr con: `set -a && source apps/server/.env && set +a && pnpm --filter @regicide/server test`.

### Paleta Dark Fantasy fría (P2)
- Extraída programáticamente (Pillow) de las referencias `assets dark fantasy/` (gitignored). Tokens en `:root`: `--bg #0b1018`, `--bg-deep #060a10`, `--felt #16222e`, `--felt-dark #101a24`, `--accent #9fc4e8` (hielo pálido), `--ivory #e4ecf5`, `--muted #8b97a8`, `--accent-glow rgba(159,196,232,.25)`. Renombrados `--gold`→`--accent` y `--card-glow`→`--accent-glow`; rgba cálidos enfriados; `.immunity` `#b3a3c8`; `.conn-on` `#79d6b2`.

### Tablero compacto a una pantalla + tipografía +~20% (P1)
- `.game-screen` pasa a `height:100dvh; overflow:hidden` (desktop ya no scrollea); tipografía +~20% (vida, ataque, stats, labels, turno); **cartas de mano 72→104px**; media queries de altura baja escalan con `zoom` (≤880px 0.92, ≤760px 0.8) para no recortar contenido.

### StepBanner (P3)
- `apps/web/src/components/StepBanner.tsx`: el paso actual ("Paso 1/4", `aria-live`) se muestra en grande sobre la mano con botón colapsable (`aria-expanded`) que despliega la descripción completa + el **registro** de la partida. Reemplaza a `phase-hint`/`log-box`/`turn-indicator` (eliminados). Claves i18n nuevas: `stepLabel`, `detailsMore`, `detailsLess`, `logTitle`; `phaseChoose`/`phaseSuffer` ya no llevan prefijo "Paso N —".

### Golpe pesado (P4)
- `HEAVY_HIT_THRESHOLD = 10` en `EnemyPanel.tsx`: daño ≥10 muestra "−N" más grande en rojo con resplandor y sacude la carta del enemigo (`@keyframes enemy-shake`; respeta `prefers-reduced-motion`).

### Arrastrar para jugar (P5)
- `apps/web/src/hooks/useCardDrag.ts` (Pointer Events, umbral ~6px) + `apps/web/src/components/CardDragGhost.tsx` (fantasma del grupo arrastrado). Soltar sobre mesa/enemigo → `play()` (solo si `canPlay`). `CardFan` expone `onCardPointerDown` + `suppressClick` (suprime el clic posterior al arrastre); `touch-action:none` en las cartas. El clic y el botón "Jugar" siguen como fallback. Online activo solo con `isMyTurn && phase === 'choose_action'`.

## Cómo verificar cambios

- Tras tocar web: `pnpm --filter @regicide/web build` y probar contra el server local en :3001 (el server sirve el build). Para el flujo online: 2 pestañas en `http://localhost:3001/`.
- Repro CDP headless disponible (`/tmp/cdp_solo.js`, Chrome con `--remote-debugging-port=9222`) que automatiza solo: home → setup → tablero → screenshot → drag & drop. Revisa que el server :3001 esté vivo antes.
- Para prod: push a `main` → Render auto-deploy → https://regicide-web.onrender.com/ (esperar cold start).
