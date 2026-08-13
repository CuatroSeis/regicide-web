# Fuente oficial de reglas — Regicide

- **Fuente**: PDF oficial de Badgers From Mars (diseñadores Paul Abrahams, Luke Badger, Andy Richdale).
- **URL**: https://www.regicidegame.com/site_files/33132/upload_files/RegicideRulesA4.pdf
- **Versión adaptada**: juego con **mazo estándar de 52 cartas + jokers** (no el mazo ilustrado oficial). Las reglas de este documento son las que gobiernan este proyecto.
- Cada regla tiene un ID `[R-x]` para trazabilidad en código, tests y commits. Las citas entre comillas son del PDF oficial.

---

## Setup

**[R-1] Castillo (mazo de enemigos)**: barajar los 4 Reyes y apilarlos boca abajo; barajar las 4 Reinas encima; barajar las 4 Jotas encima. "Turn the top card face up to reveal a Jack. This will become the current enemy."

**[R-2] Taverna (mazo de robo)**: "Shuffle together all the cards numbered 2 to 10 with the 4 Animal Companions (♠A♥A♣A♦A) and a number of Jesters (based on the number of players)". Cantidad de Jesters:

| Jugadores | Jesters | Mano máxima |
|---|---|---|
| 1 | 0 | 8 |
| 2 | 0 | 7 |
| 3 | 1 | 6 |
| 4 | 2 | 5 |

**[R-3] Descarte**: durante el juego las cartas descartadas van a un descarte compartido junto a la Taverna.

**[R-4] Primer jugador**: "The player to have most recently committed regicide goes first." En la versión digital: al azar (solo) u orden de unión a la sala (online).

## Enemigos

**[R-5] Stats**:

| Enemigo | Ataque | Vida |
|---|---|---|
| Jota | 10 | 20 |
| Reina | 15 | 30 |
| Rey | 20 | 40 |

## Turno — 4 pasos

"Each turn has four steps: Step 1 - Play a card or yield; Step 2 - Activate the suit power; Step 3 - Deal damage to the enemy and check; Step 4 - Suffer damage from the enemy."

### Paso 1 — Jugar o rendirse

**[R-6] Jugar una carta**: el número determina el valor de ataque. Alternativa: rendirse (ver [R-9]).

**[R-7] Combos**: "players can combine cards together in sets of 2, 3 or 4 of the same number as long as the combined total of the cards played equals 10 or less." → pares de 2s-5s, triples de 2s-3s, cuádruple de 2s. "all suit powers are resolved at the total attack value."

**[R-8] Animal Companions (Ases)**: valor 1. "can be played on their own, but may also be paired with one other card (except the Jester)". Dos Ases pueden emparejarse entre sí. "If you play an Animal Companion with another card of the same suit, you only apply the suit power once." "Animal Companions cannot be added to a combo or played as a combo on their own."

**[R-9] Rendirse**: "To yield simply say 'Yield' and move directly to Step 4, skipping Steps 2 and 3. A player may not yield if every other player has yielded on their last turn."

### Paso 2 — Poder del palo

**[R-10] Obligatoriedad**: "Suit powers are mandatory and cannot be skipped."

**[R-11] ♥ Corazones — Recuperar del descarte**: "Shuffle the discard pile then count out a number of cards facedown equal to the attack value played. Place them under the Tavern deck (no peeking!) then, return the discard pile to the table, faceup."

**[R-12] ♦ Diamantes — Robar**: "The current player draws a card. The other players follow in clockwise order drawing one card at a time until a number of cards equal to the attack value played have been drawn. Players that have reached their maximum hand size are skipped. Players may never draw cards over their maximum hand size. There is no penalty for failing to draw cards from an empty Tavern deck."

**[R-13] ♣ Tréboles — Daño doble**: "During Step 3, damage dealt by clubs counts for double."

**[R-14] ♠ Picas — Escudo**: "During Step 4, reduce the attack value of the current enemy by the attack value played. The shield effects of spades are cumulative for all spades played against this enemy by any player, and remain in effect until the enemy is defeated."

**[R-15] Inmunidad del enemigo**: "Each enemy is immune to the suit powers of cards played against them which match their suit." El número sí suma al daño. El Jester anula la inmunidad (ver [R-20]).

**[R-16] Corazones + Diamantes juntos**: "Any time where both a Hearts power and Diamonds power are resolved together, resolve the Hearts healing before drawing with Diamonds."

### Paso 3 — Daño y derrota

**[R-17] Daño**: "Damage equal to the attack value of the played card is now dealt to the enemy." (x2 si se activó tréboles, [R-13]). "Check to see if the total damage dealt by all players so far is equal to or greater than the enemy's health."

**[R-18] Derrota del enemigo**: si la vida llega a 0 o menos:
1. "(i) Place the enemy in the discard pile. If the players have dealt damage exactly equal to the enemy's health, place it facedown on top of the Tavern deck instead."
2. "(ii) Place all cards played by players against the enemy in the discard pile."
3. "(iii) Turn the next card of the Castle deck face up."
4. "(iv) The player who has just defeated the enemy skips Step 4 and begins a new turn against the enemy just revealed, starting at Step 1."

### Paso 4 — Sufrir daño

**[R-19] Cubrir el ataque**: "The current player must discard cards from their hand with a total value at least equal to the enemy's attack value." (reducida por picas acumuladas, [R-14]). "Discard the cards one at a time, faceup to the discard pile. Animal Companions (A) have a value of 1 and the Jester a value of 0 when discarded to cover damage. If the player cannot discard enough cards to satisfy the damage, they die and all players lose the game. It's ok to have an empty hand." Después del daño, el siguiente jugador en sentido horario empieza su turno.

## El Jester

**[R-20] Jugar el Jester**: "the Jester may be played (always on its own). The Jester has an attack value of 0. The power of the Jester is that it negates the immunity of the enemy... After playing the Jester, skip steps 3 and 4 then, instead of play moving to the next player the player of the Jester chooses any player to go next."

**[R-21] Jester vs enemigo de ♠/♣**: "If the Jester is played against a spades enemy, spades played prior to the Jester will begin reducing the attack value of the enemy however clubs played prior to the Jester against a clubs enemy will not count for double."

## Reglas de solo (1 jugador)

**[R-22] Solo**: "Set up the game as per usual but place the two Jesters to the side. You play with a single hand limited to 8 cards. Play as normal, playing each turn one after the other. A Jester can be flipped to activate the following power: 'Discard your hand and refill to 8 cards - this does not count as drawing for the purpose of enemy diamond immunity.' Since you have two Jesters this can be done twice per game. Flipping the Jesters in this way does not cancel enemy immunity. You are allowed to use the Jester power a) at the start of Step 1 before you play a card or b) at the start of Step 4 before you have to take damage."

**[R-23] Niveles de victoria (solo)**: "A win having used 2 Jesters = Bronze Victory. A win having used 1 Jester = Silver Victory. A win having used 0 Jesters = Gold Victory."

## Cartas de enemigos derrotados en mano

**[R-24] Enemigos como cartas**: "Jacks in hand count as a 10, Queens in hand count as a 15 and Kings in hand count as a 20. These values are applied when either playing them as an attack card or discarding them from hand to suffer damage. Their suit power is applied as normal when played."

## Fin de partida

**[R-25] Victoria**: se derrota al último Rey. **Derrota**: un jugador no puede cubrir el daño de un enemigo, "The players also lose if any player is unable to play a card or yield on their turn."
