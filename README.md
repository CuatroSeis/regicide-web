# Regicide Web — Fan Made

Adaptación **fan-made y sin fines de lucro** del juego de cartas cooperativo
**Regicide** (de Badgers From Mars) para jugar en el navegador con un **mazo
estándar de 52 cartas + Jokers**. Está pensada para jugarse en modo **solo
(1 jugador)** y en **2 a 4 jugadores online** (en desarrollo).

> Este proyecto **no está afiliado, respaldado ni aprobado** por Badgers From
> Mars ni por los diseñadores del juego. Consulta la sección
> [Aclaraciones y descargos de copyright](#aclaraciones-y-descargos-de-copyright).

## Estado del proyecto

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Infraestructura del monorepo | ✅ Completa |
| 1 | Motor de reglas (`packages/engine`) | ✅ Completa |
| 2 | Web en modo solo (`apps/web`) | ✅ Completa |
| 3 | Multijugador online 2p (`apps/server`) | 🚧 En curso |

El motor implementa las reglas del juego con **IDs trazables `[R-x]`** que
remiten a la fuente oficial (`docs/rules-source.md`, extracto del PDF de
reglas de Badgers From Mars). Esto incluye: combos de cartas del mismo número
con suma ≤ 10, Ases como Animal Companions, poderes de palo (♥ recuperar,
♦ robar, ♣ daño doble, ♠ escudo), inmunidad del enemigo a su palo, kill exacto,
contraataque, Jesters según cantidad de jugadores y niveles de victoria en
solitario (Oro/Plata/Bronce).

## Estructura del repositorio

Monorepo con [pnpm workspaces](https://pnpm.io/workspaces):

```
.
├── packages/engine   # Motor de reglas en TypeScript puro (sin dependencias)
├── apps/web          # Frontend React + Vite + Framer Motion
├── apps/server       # Servidor Socket.io con salas por código (modo online)
└── docs              # Fuente oficial de reglas con IDs [R-x]
```

### Comandos

```bash
pnpm install          # instalar dependencias
pnpm test             # tests de todos los paquetes (Vitest + cobertura)
pnpm typecheck        # typecheck de todos los paquetes
pnpm lint             # ESLint de todos los paquetes
pnpm build            # build de todos los paquetes
pnpm --filter @regicide/web dev   # levantar el frontend en modo desarrollo
```

## Reglas del juego

Las reglas completas, con su fuente, están en
[`docs/rules-source.md`](docs/rules-source.md). Los puntos clave para el mazo
estándar:

- **Jesters por jugador**: 1p=0, 2p=0, 3p=1, 4p=2 (en solitario los 2 Jesters
  se apartan para su poder especial).
- **Mano máxima**: `9 - jugadores` (8 en solo, 7 en 2p, 6 en 3p, 5 en 4p).
- **Combos**: pares de 2s-5s, triples de 2s-3s y cuádruple de 2s (suma ≤ 10).
- **Ases** (Animal Companions): valor 1, solos o emparejados con otra carta.
- **Poderes de palo** obligatorios; el enemigo es inmune al poder de su palo.
- **Kill exacto**: el enemigo derrotado con daño exacto va al tope de la
  Taverna boca abajo; si no, al descarte.
- **Derrota**: un jugador muere si no puede cubrir el ataque del enemigo.

## Aclaraciones y descargos de copyright

- **Regicide** es un juego de cartas cooperativo creado por **Paul Abrahams,
  Luke Badger y Andy Richdale** (publicado como *Badgers From Mars*). Todas las
  reglas y el nombre del juego pertenecen a sus autores. Este proyecto adapta
  esas reglas para mazo estándar **con fines educativos y no comerciales**,
  y las cita desde el PDF oficial de reglas.
- Este es un proyecto **fan-made**: no está afiliado, patrocinado ni aprobado
  por los autores ni por Badgers From Mars. Si los titulares lo solicitan, el
  material se retirará de inmediato.
- Los **gráficos de las cartas** provienen de
  [htdebeer/SVG-cards](https://github.com/htdebeer/SVG-cards) v4.0.2, con
  licencia **LGPL-2.1** y autor original **David Bellot**. Se distribuyen sin
  modificaciones más allá del uso directo del sprite.
- La **lógica de juego, la interfaz y el resto del código** de este
  repositorio se distribuyen bajo licencia **MIT** (ver [`LICENSE`](LICENSE)).

## Créditos

- **Regicide** — Paul Abrahams, Luke Badger y Andy Richdale (Badgers From Mars).
  Reglas: https://www.regicidegame.com/
- **SVG-cards** — htdebeer/SVG-cards v4.0.2 (LGPL-2.1), autor original David
  Bellot. https://github.com/htdebeer/SVG-cards
- **Autor del proyecto** — [CuatroSeis](https://github.com/CuatroSeis)

---

**¿Te gusta este proyecto?** Reporta bugs o sugerencias en los issues del
repositorio. Jugar Regicide en papel también es genial: apoya a sus autores
comprando el juego oficial.
