---
name: dark-fantasy-theme
description: Usar al rediseñar o revisar la UI de apps/web con la dirección artística "Dark Fantasy" de Regicide: tokens, texturas SVG embebidas (grano, bloques de piedra, almenas, marco astillado), luz/atmósfera (glow central + viñeta + niebla) y reglas de acento. Basado en el análisis programático de las 7 imágenes de referencia (assets dark fantasy/).
---

# Tema Dark Fantasy

## Cuándo usar esta skill

Al cambiar colores, fondos, paneles, botones, bordes o atmósfera en `apps/web/src/index.css`, o al agregar una pantalla/componente nuevo que deba respetar la estética existente.

## Contexto: qué dice el análisis de las referencias

Las 7 imágenes en `assets dark fantasy/` (gitignored; el modelo no puede verlas → el análisis fue programático con Pillow) comparten un ADN que es **más que "colores fríos"**:

- **Profundidades casi negras**: brillo promedio 20–55/255; bases `#010102`–`#1c1d1a`.
- **Glow central fuerte**: 6/7 imágenes tienen el centro 15–55 puntos más brillante que el borde (firma "luz desde el centro").
- **Único acento cálido = luz de vela pálido-oro** (familia `#dca26c` / `#f3d19c` / `#a39d56`). El resto de la paleta es fría (azul noche, teal-oliva, índigo arcano, borgoña).
- **Atmósfera**: viñeta, niebla y textura de piedra; nada plano.

## Tokens (ya en `:root` de `index.css`)

- Base: `--bg #06090f`, `--bg-deep #030509`, `--felt #141d2b`, `--felt-dark #0d1420`.
- Acentos: `--accent #9fc4e8` (hielo), `--ivory`, `--muted`.
- Luz: `--ember #e8ba84` + `--ember-glow rgba(232,186,132,0.16)` — **el único cálido permitido**; `--vignette rgba(1,3,6,0.55)`; `--accent-glow`.
- Superficies: `--panel-bg rgba(13,20,30,0.82)`, `--stone-edge rgba(159,196,232,0.3)`.

## Texturas (SVG data-URI, sin assets externos)

Todas viven como custom properties en `:root` para reutilizarlas sin copiar:

- `--tex-grain`: feTurbulence + feColorMatrix **a alpha bajo** (speckle negro sutil, ~7%). OJO histórico: la versión original (rect negro opaco 0.93 sobre el ruido) era un **velo casi opaco** que aplastaba todo el contenido (carta 240 → 53 lum). El grano debe ser un speckle casi transparente, NUNCA una capa opaca.
- `--tex-block`: patrón de bloques de piedra (ashlar, juntas desplazadas).
- `--tex-battlement`: tira de almenas (crenellations) para `::before` de paneles. Rellenos 0.55–0.72, sino la viñeta las vuelve invisibles (medido: 0.38 → invisible).
- `--frame-ruin`: marco `border-image` 9-slice de piedra astillada (esquinas rotas). Con `border: 14px solid transparent; border-image: var(--frame-ruin) 14 round;` y `border-radius: 0` (border-image no sigue el radius).

## Atmósfera por pantalla

- **Tablero** (`.game-screen::before`): glow central doble (capa hielo `rgba(159,196,232,.1)` + velo vela `--ember-glow`) detrás del enemigo + viñeta radial inset + grano. `.game-screen::after`: niebla baja (blobs radiales + gradiente lineal) sobre la mano.
- **Pantallas no-juego** (`.screen::after`): viñeta + grano a menor intensidad. `pointer-events: none` y `z-index: 1` en todos los overlays atmosféricos.
- **Paneles**: `--panel-bg` + `--tex-block` + bisel `inset` + sombra exterior. Botones como placas de piedra (bisel `inset 0 1px 0 rgba(228,236,245,.1)` + sombra inferior).

## Reglas

1. **Nunca** fondos planos `rgba(255,255,255,.0X)` en paneles grandes ni bordes `rgba(228,236,245,...)`: usar `--panel-bg` + `--stone-edge` + textura.
2. **Único cálido**: `--ember`/`--ember-glow` (vela). Los colores de estado se mantienen: `#79d6b2` (on), `#ff8f8f` (off/daño), `#ff6b6b` (golpe pesado), `#b3a3c8` (inmunidad).
3. Respeta `prefers-reduced-motion` (ya hay media query global que anula animaciones/transiciones).
4. Mantén el tablero one-screen: overlays atmosféricos con `pointer-events:none`; no agregar elementos que crezcan en altura sin recorte.
5. Cualquier string nuevo va a `apps/web/src/i18n/translations.ts` en es/en/pt (paridad de claves).
6. Si se reintroducen colores, verificar muestreando píxeles del build (Pillow): glow central > bordes, y `RB` (R−B) positivo solo en la zona de vela detrás del enemigo.

## Verificación

Tras cambios: `pnpm --filter @regicide/web build`, reproducir con `/tmp/cdp_v5.js` (banner sobre las cartas vía `elementFromPoint`, sin overflow vertical, drag & drop) y muestrear píxeles del screenshot (Python + PIL). Estilos sin tokens se detectan con `rg` sobre `index.css`.
