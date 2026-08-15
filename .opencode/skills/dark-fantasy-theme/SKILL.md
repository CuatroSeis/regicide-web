---
name: dark-fantasy-theme
description: Usar al rediseñar o revisar la UI de apps/web con la dirección artística "Dark Fantasy" de Regicide: tokens, texturas SVG embebidas (grano, bloques de piedra, almenas, sillares, grietas), luz fría desde arriba SIN vela, skin gótico de fortaleza en ruinas (arcos ojivales, puerta en ruinas, escalón roto) y reglas de acento. Basado en el análisis programático de las referencias (assets dark fantasy/, incl. castle/).
---

# Tema Dark Fantasy

## Cuándo usar esta skill

Al cambiar colores, fondos, paneles, botones, bordes o atmósfera en `apps/web/src/index.css`, o al agregar una pantalla/componente nuevo que deba respetar la estética existente.

## Contexto: qué dice el análisis de las referencias

Las imágenes en `assets dark fantasy/` (gitignored; el modelo no puede verlas → el análisis fue programático con Pillow) comparten un ADN que es **más que "colores fríos"**:

- **Profundidades casi negras**: brillo promedio 20–55/255; bases `#010102`–`#1c1d1a`.
- **Luz desde arriba (firma del castillo)**: en las refs de `castle/`, el cielo es lo más brillante y la base se oscurece (`#…top` lum ~65–114 → base ~16–32). El centro de la carta del enemigo NUNCA lleva glow cálido (decisión de usuario V4.2: la vela chocaba con las letras hielo sobre la carta). Excepción invertida: `images.jpeg` (glow centrado) y `images (1).jpeg` (tono desaturado).
- **Paleta fría dominante**: azul noche/hielo (54–60% de píxeles fríos en las refs) + acentos teal-oliva/índigo. El único cálido vivo está en detalles pequeños (fuego, madera, dorado de la carta).
- **Atmósfera**: viñeta, niebla baja y textura de piedra; nada plano.

## Tokens (ya en `:root` de `index.css`)

- Base: `--bg #06090f`, `--bg-deep #030509`, `--felt #141d2b`, `--felt-dark #0d1420`.
- Acentos: `--accent #9fc4e8` (hielo), `--ivory`, `--muted`.
- Luz: `--vignette rgba(1,3,6,0.55)`; `--accent-glow`. `--ember #e8ba84` / `--ember-glow` quedan definidos pero **sin uso** desde V4.2 (no hay vela en el tablero).
- Superficies: `--panel-bg rgba(13,20,30,0.82)`, `--stone-edge rgba(159,196,232,0.3)`.

## Texturas (SVG data-URI, sin assets externos)

Todas viven como custom properties en `:root` para reutilizarlas sin copiar:

- `--tex-grain`: feTurbulence + feColorMatrix **a alpha bajo** (speckle negro sutil, ~7%). OJO histórico: la versión original (rect negro opaco 0.93 sobre el ruido) era un **velo casi opaco** que aplastaba todo el contenido (carta 240 → 53 lum). El grano debe ser un speckle casi transparente, NUNCA una capa opaca.
- `--tex-block`: patrón de bloques de piedra (ashlar, juntas desplazadas).
- `--tex-battlement`: tira de almenas (crenellations) para `::before` de paneles. Rellenos 0.55–0.72, sino la viñeta las vuelve invisibles (medido: 0.38 → invisible).
- `--tex-ashlar-frame`: marco `border-image` 36×36 de sillares con `12 round` (`border:6px solid transparent`) — doble contorno del skin gótico (línea interior + sillares). Requiere `border-radius:0`.
- `--tex-stone`: relieve grueso de piedra (feTurbulence alpha 0.06) para fondos de paneles y botones.
- `--tex-crack`: polilínea irregular para grietas finas en esquinas.
- `--frame-ruin`: marco `border-image` 9-slice de piedra astillada (esquinas rotas). Con `border: 14px solid transparent; border-image: var(--frame-ruin) 14 round;` y `border-radius: 0` (border-image no sigue el radius).

## Atmósfera por pantalla

- **Tablero** (`.game-screen::before`): **luz fría desde el cielo** (radial `ellipse 70% 46% at 50% 0% rgba(159,196,232,0.12)`) + viñeta radial inset + grano. **No usar glow central cálido** (V4.2). `.game-screen::after`: niebla baja (blobs radiales + gradiente lineal) sobre la mano.
- **Pantallas no-juego** (`.screen::after`): viñeta + grano a menor intensidad. `pointer-events: none` y `z-index: 1` en todos los overlays atmosféricos.
- **Skin gótico** (V4.2, forma sin tocar colores): `.enemy-panel` con arco ojival + borde roto (`clip-path`), marco sillar `--tex-ashlar-frame`, almenas y grieta; `.enemy-card-wrap` como ventana gótica (`::before` arco apuntado + `::after` mainullones); `.table-cards` como puerta en ruinas; `.game-header::after` almenas; `.menu-button` con chamfer (`clip-path` esquinas superiores); `.hand-area::before` escalón de piedra rota (sombra con borde irregular, no elipse).
- **Paneles**: `--panel-bg` + `--tex-stone`/`--tex-block` + bisel `inset` + sombra exterior. Botones como placas de piedra (bisel `inset 0 1px 0 rgba(228,236,245,.1)` + sombra inferior).

## Reglas

1. **Nunca** fondos planos `rgba(255,255,255,.0X)` en paneles grandes ni bordes `rgba(228,236,245,...)`: usar `--panel-bg` + `--stone-edge` + textura.
2. **Sin vela en el tablero** desde V4.2: todo el fondo del panel debe quedar frío (`R−B ≤ 0`). Los colores de estado se mantienen: `#79d6b2` (on), `#ff8f8f` (off/daño), `#ff6b6b` (golpe pesado), `#b3a3c8` (inmunidad).
3. Respeta `prefers-reduced-motion` (ya hay media query global que anula animaciones/transiciones).
4. Mantén el tablero one-screen: overlays atmosféricos con `pointer-events:none`; no agregar elementos que crezcan en altura sin recorte. **No reintroducir `zoom` sobre `.game-screen`** (recorta el contenido bajo `zoom×100dvh`): el zoom responsive vive en `.game-inner` (ver V4.2).
5. Cualquier string nuevo va a `apps/web/src/i18n/translations.ts` en es/en/pt (paridad de claves).
6. Si se reintroducen colores, verificar muestreando píxeles del build (Pillow): arriba del tablero más brillante que el centro/base, y `R−B ≤ 0` detrás de la carta del enemigo.

## Verificación

Tras cambios: `pnpm --filter @regicide/web build`, reproducir con `/tmp/cdp_v5.js` (banner sobre las cartas vía `elementFromPoint`, sin overflow vertical, drag & drop) y muestrear píxeles del screenshot (Python + PIL): brillo decreciente arriba→abajo y sin `R−B>0` en el fondo del panel. Ventanas ≤760px de alto deben ver el banner abierto completo y los controles (probar 1280×713). Estilos sin tokens se detectan con `rg` sobre `index.css`.
