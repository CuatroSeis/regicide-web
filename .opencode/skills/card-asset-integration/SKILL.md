---
name: card-asset-integration
description: Usar al agregar, mapear o depurar los assets SVG de cartas (sprite svg-cards de htdebeer/SVG-cards) en apps/web, incluyendo la atribución de licencia LGPL-2.1 requerida. Estrategia: sprite + <use href="...#id">.
---

# Integración de assets de cartas

## Cuándo usar esta skill

Al conectar el modelo de datos (`Card` de `packages/engine`) con los SVG reales en `apps/web`, o al depurar por qué una carta no se ve o se ve mal.

## Contexto del asset

`htdebeer/SVG-cards` v4 publica un **único sprite** `svg-cards.svg` donde cada carta es un objeto con un `id` (`#club_2`, `#heart_jack`, `#diamond_king`, `#joker_red`, `#back`, etc.). No hay un SVG individual por carta. Se consume así:

```jsx
<svg viewBox="..."><use href="/cards/svg-cards.svg#club_2" /></svg>
```

## Instrucciones

1. El sprite vive en `apps/web/public/cards/svg-cards.svg` (crear si no existe). Para v1 basta el sprite completo; optimizarlo con SVGO solo si el peso (~1 MB) es un problema real.
2. Definir una única función de mapeo `Card -> id del sprite` en un solo lugar (`apps/web/src/lib/cardAssets.ts`), nunca hardcodear el id en los componentes.
3. Renderizar la carta con un componente `CardFace` que use el `<use>` con referencia absoluta al sprite (`/cards/svg-cards.svg#<id>`) para que funcione en todos los navegadores modernos.
4. Verificar que `README.md` y/o una pantalla de créditos in-app tengan la nota de atribución LGPL-2.1 de `htdebeer/SVG-cards` (y del autor original David Bellot). Si falta, agregarla como parte de la misma tarea, no como pendiente separado.
5. No modificar el contenido artístico del SVG más allá de optimización de tamaño — son gráficos de terceros bajo licencia, no assets propios para rediseñar.
