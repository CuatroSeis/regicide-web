# Regicide Web — Fan Made

Adaptación **fan-made y sin fines de lucro** del juego de cartas cooperativo
**Regicide** (de Badgers From Mars) para jugar en el navegador con un **mazo
estándar de 52 cartas + Jokers**. Está pensada para jugarse en modo **solo
(1 jugador)** y en **2 a 4 jugadores online**.

> Este proyecto **no está afiliado, respaldado ni aprobado** por Badgers From
> Mars ni por los diseñadores del juego. Consulta la sección
> [Aclaraciones y descargos de copyright](#aclaraciones-y-descargos-de-copyright).

## Estado del proyecto

| Fase | Alcance | Estado |
|---|---|---|
| 8 | 29 avatares game-icons + marcos Kenney (botones, paneles, chips) | ✅ Deployada |
| 9 | Kenney total — eliminación del skin gótico, toda la UI bajo placas Kenney | ✅ Deployada |
| 10 | Sin banner — mano protagonista, hint sobre controles, overlay de Registro | ✅ Deployada |
| 11 | Texturas Kenney reales (retro-textures-fantasy) + paleta piedra fría | ✅ Deployada |
| 12 | Fix defensa — drag y botón "Cubrir daño" funcionan correctamente | ✅ Deployada |

> Ver [UPDATES.md](UPDATES.md) para el historial completo (V0–V12).

## Jugar online

El modo multijugador está deployado en un solo servicio:

### **https://regicide-web.onrender.com/**

1. Creá una cuenta o iniciá sesión (requiere email y contraseña).
2. Abrí la URL en **2 a 4 pestañas o ventanas** del navegador.
3. En una pestaña creá una sala y copiá el código.
4. En las demás unite con ese código.

> **Avisos del plan free de Render:** el servicio duerme tras ~15 min de
> inactividad y la primera visita tarda ~1 min en despertar (cold start). Las
> salas viven en memoria del server: se pierden si el servicio duerme o se
> vuelve a deployar. La **tabla de posiciones**, en cambio, persiste en
> Supabase (Postgres externo) y sobrevive a cold starts y redeploys.

## Iteraciones anteriores

Las secciones detalladas de V4 a V6 (Dark Fantasy, autenticación, i18n) se
encuentran en [UPDATES.md](UPDATES.md).

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
├── apps/web          # Frontend React + Vite + Framer Motion + Supabase Auth
├── apps/server       # Salas por código con Socket.io + auth JWT + sirve el build de la web
├── docs              # Fuente oficial de reglas con IDs [R-x]
└── .opencode/skills  # Skills de desarrollo (reglas, commits, assets, dark fantasy)
```

> `apps/server` también sirve el build estático de `apps/web` en el mismo
> origen, lo que permite deployar todo en un solo servicio (como el de
> Render).

### Comandos

```bash
pnpm install          # instalar dependencias
pnpm test             # tests de todos los paquetes (Vitest + cobertura)
pnpm typecheck        # typecheck de todos los paquetes
pnpm lint             # ESLint de todos los paquetes
pnpm build            # build de todos los paquetes
pnpm --filter @regicide/web dev   # levantar el frontend en modo desarrollo
pnpm --filter @regicide/server start   # server: web estática + Socket.io en :3001
pnpm --filter @regicide/web test  # tests de la web (Testing Library, 40 tests)
pnpm --filter @regicide/engine test  # tests del motor (254 tests, coverage)
pnpm --filter @regicide/server test  # tests del server (vitest)
```

### Variables de entorno

Los archivos ejemplo documentan las variables locales:
- `apps/web/.env.example` — frontend (Supabase URL + publishable key)
- `apps/server/.env.example` — server (puerto, CORS, Supabase secret key, database URL)

**En producción (Render)** el servicio necesita estas 5 variables:

| Variable en Render | Valor (dashboard de Supabase → Settings → API) |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (`https://<proyecto>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) — pública por diseño |
| `SUPABASE_URL` | La misma Project URL |
| `SUPABASE_SERVICE_KEY` | Secret key (`sb_secret_…`) ⚠️ nunca exponer al cliente |
| `DATABASE_URL` | Cadena Postgres (leaderboard; pooler de transacciones) |

> **Importante**: las variables `VITE_*` se leen **en tiempo de build**
> (Vite las inlinea en el bundle). Si se cambian en el dashboard hay que
> disparar un **Manual Deploy** para que el nuevo build las incorpore.

## Deploy

- Un solo servicio en [Render](https://render.com) (`render.yaml`), plan free.
- **Auto-deploy**: cada push a `main` dispara el build vía webhook de GitHub
  en el repo. Si los pushes no deployan, verificar
  *GitHub repo → Settings → Webhooks* (debe existir el hook de Render).
- El server sirve el build estático de `apps/web/dist` + Socket.io en el
  mismo origen. Salud: `healthCheckPath: /`.
- Las salas viven en memoria (ver avisos arriba); su persistencia es la
  candidata natural para una próxima iteración.

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
- **Íconos de avatar** — [game-icons.net](https://game-icons.net/) (CC-BY 3.0),
  autores: Lorc, Delapouite, Carl Olsen, Cathelineau, Kier Heyl y Skoll.
  Recortes del pack "medieval-fantasy" en variante blanca.
- **Marcos de UI** — [Kenney](https://www.kenney.nl) "Fantasy UI Borders"
  (CC0), teñidos programáticamente a la paleta del tema.
- **Texturas de UI** — [Kenney](https://www.kenney.nl) "Retro Textures
  Fantasy" (CC0), horneadas oscuras para la paleta del tema.
- **Autor del proyecto** — [CuatroSeis](https://github.com/CuatroSeis)

---

**¿Te gusta este proyecto?** Reporta bugs o sugerencias en los issues del
repositorio. Jugar Regicide en papel también es genial: apoya a sus autores
comprando el juego oficial.
