# Historial de versiones

Changelog del proyecto Regicide Web — desde la infraestructura inicial hasta la
última iteración.

---

## V0 — Infraestructura del monorepo

Monorepo con pnpm workspaces: `packages/engine` (motor de reglas en TS puro),
`apps/web` (React + Vite), `apps/server` (socket.io + sirve el build estático).

## V1 — Motor de reglas

El engine implementa las reglas de Regicide con IDs trazables `[R-x]` que
remiten a la fuente oficial (`docs/rules-source.md`). Incluye: combos (pares/
triples con suma ≤ 10), Ases como Animal Companions, poderes de palo (♥
recuperar, ♦ robar, ♣ daño doble, ♠ escudo), inmunidad del enemigo a su palo,
kill exacto, contraataque, Jesters por cantidad de jugadores y niveles de
victoria en solitario (Oro/Plata/Bronce).

## V2 — Web en modo solo

Tablero interactivo con 52 cartas + Jokers, drag & drop, animaciones de viaje
de cartas y fase de derrota/victoria.

## V3 — Multijugador online

Salas por código con Socket.io (2-4 jugadores), auth JWT, rejoin tras recarga.
Deploy en Render (un solo servicio, plan free).

## V4 — Dark Fantasy

- **Paleta Dark Fantasy fría**: negros azul-noche, superficies de pizarra y
  acento "hielo pálido", reemplazando los tonos cálidos anteriores.
- **Tablero compacto a una pantalla**: sin scroll en desktop, tipografía ~20%
  más grande, cartas de mano 104px.
- **Banner de paso**: el paso actual ("Paso 1/4") se muestra en grande sobre la
  mano; un botón despliega la descripción y el registro.
- **Golpe pesado**: daños ≥10 muestran un número grande en rojo y sacuden la
  carta del enemigo.
- **Arrastrar para jugar**: seleccioná y arrastrá cartas sobre la mesa/enemigo.
- **Tabla de posiciones persistente**: resultados guardados en PostgreSQL
  (Supabase); si no hay base, cae a JSON local.
- **Dark Fantasy profundo** (V4.1): análisis de referencias de arte → viñeta,
  niebla, textura de bloques y grano, marcos de piedra astillada
  (`border-image`), todo con SVG embebido.
- **Fix StepBanner**: el panel desplegado ya no queda detrás de las cartas.

## V5 — Autenticación y perfil

- Login y registro con Supabase Auth (email + contraseña).
- Recuperación de contraseña por email.
- Verificación de email.
- Perfil de usuario: nombre, email, contraseña y avatar (5 opciones basadas en
  cartas).
- Avatar en el menú principal.
- Accesibilidad: tabs ARIA, health bar con `role="progressbar"`, overlays con
  Escape, labels asociados.
- Seguridad del server: rate limiting, security headers, SQL injection guard,
  graceful shutdown, room TTL.

## V6 — i18n y avatares reales

- Avatares con arte real de cartas: recortes de la figura central de ♠K, ♥Q,
  ♣J, pipa de ♠A y Joker rojo sobre `svg-cards.svg`.
- i18n completo: el motor emite el registro como eventos estructurados
  (`LogEntry { key, args }`); la web los traduce (es/en/pt).
- Errores visibles al usuario con códigos estables (`GameError.code`,
  ~30 códigos) traducidos.
- Endurecimiento de auth: warnings localizados si faltan variables de Supabase.

## V7 — GameBoard compartido

- **GameBoard unificado**: nuevo componente `GameBoard.tsx` que renderiza el
  shell completo del tablero; `GameScreen` y `OnlineGameScreen` quedan como
  adaptadores delgados.
- **RivalsPanel online**: chips por rival con nombre, contador de cartas,
  indicador de conexión y resaltado de turno activo.
- **StepBanner flotante**: drawer anclado bajo el head que se despliega sobre
  la mesa (no consume layout). Auto-colapsa al cambiar de fase.
- **Mesa protagonista**: cartas jugadas 48→60px, agrupación por jugador con
  chip de autoría. Pop-in animado.
- Tests web: 34 total.

## V8 — Avatares game-icons + chrome Kenney

- **29 avatares de perfil**: íconos de game-icons.net (CC-BY 3.0) reemplazan a
  las 5 cartas genéricas. SVGs blancos monocromo en `public/avatars/`.
- **Marcos Kenney** "Fantasy UI Borders" (CC0): PNGs blancos teñidos con PIL
  (piedra `#7d8a9e` normal / hielo `#9fc4e8` hover), aplicados como
  `border-image` 9-slice nativo. Dos tintes por frame: stone (normal) e ice
  (hover/current).
- Diseños elegidos por contact sheet programático: Double 011 (botones),
  Double 028 (paneles), Default 002 (chips).

## V9 — Kenney total

- **Skin gótico fuera**: arcos ojivales, almenas, grietas, portón en ruinas,
  escalón roto — todo eliminado. Enemy-panel, mesa y carta del rival pasan a
  ser placas rectangulares con marco Kenney + textura piedra interior.
- **Unificación**: pills → mini-placas (`user-badge`, contadores de pilas,
  toggle "Detalles"), health bar enmarcada y cuadrada, esquinas rectas en
  inputs/lobby/avatar-card.
- **Tokens muertos fuera**: `--frame-ruin`, `--tex-battlement`, `--tex-crack`,
  `--tex-ashlar-frame`. Fuente única de verdad: `--img-*` en `:root`.
- **Fix responsive**: drawer hacia arriba en pantallas bajas (no tapa
  controles).

## V10 — Sin banner, mano protagonista

- **StepBanner eliminado**: ya no existe el bloque "PASO N" entre mesa y mano.
- **Hint discreto**: una línea fina dentro de `.controls` (zona interactiva,
  jamás sobre la mano). Cuando jugás, texto dorado; cuando esperás online,
  tenue/cursiva.
- **Registro desde el header**: chip "Registro" abre overlay con el log completo
  (Escape cierra).
- **Mano protagonista**: `min-height` garantizada para el abanico; escalones de
  zoom recalibrados (≤880h → 0.78, ≤760h → 0.72).
- Fuera: `stepLabel`, `detailsMore`, `detailsLess` ×3 idiomas.

## V11 — Texturas Kenney reales

- **Horneado de texturas**: 6 PNGs oscurecidos desde "retro-textures-fantasy"
  (CC0) con curva de multiplicación hasta luminancia objetivo + empuje frío
  `(R×0.97, B×1.05)` en piedras; maderas cálidas sin modificar.
- **Superficies**: fondo del tablero = baldosas · enemy-panel = ladrillo ·
  botones/overlays = wall_stone · carta enemiga = placa · mesa = madera oscura
  · piso de mano = tablones con gradiente invertido (claro arriba, oscuro
  abajo).
- **Paleta derivada**: `--felt #16181e`, `--panel-bg rgba(28,31,38,.86)`,
  `--bg #07080b`. Acento hielo, marcos, viñeta y grano intactos.
- **Lección**: el desvío local (sd) NO detecta patrones grandes; validar con
  luminancia media + perfil de filas.

## V12 — Fix defensa

- **Bug**: las cartas se podían jugar para atacar pero no para defenderse.
- **Causas**: drag exclusivo del ataque (`useCardDrag` solo en `choose_action`),
  `canDiscard` era código muerto (botón "Cubrir daño" nunca se deshabilitaba),
  `yieldTurn` no limpiaba la selección en solo.
- **Fix**: `useCardDrag` con `mode: 'attack' | 'defend'`; en defensa soltar
  cartas en cualquier lado descarta si cubre el daño. Botón "Cubrir daño"
  deshabilitado hasta que la selección alcance el ataque efectivo.
- Tests web: 40 total (3 del hook `useCardDrag` + 1 del botón).
