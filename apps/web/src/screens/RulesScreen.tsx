import type { ScreenProps } from '../navigation';

export function RulesScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        Reglas
      </h1>
      <div className="rules-panel">
        <h2>Turno (4 pasos)</h2>
        <ul>
          <li><strong>Paso 1</strong> — juega una carta (o combo) o ríndete.</li>
          <li><strong>Paso 2</strong> — se activa el poder del palo jugado.</li>
          <li><strong>Paso 3</strong> — el valor juega como daño contra el enemigo.</li>
          <li><strong>Paso 4</strong> — cubre el ataque del enemigo descartando cartas.</li>
        </ul>

        <h2>Combos y Ases</h2>
        <ul>
          <li>Puedes combinar cartas del mismo número con suma ≤ 10 (pares de 2-5, triples de 2-3, cuádruple de 2).</li>
          <li>Los Ases (Animal Companions) valen 1 y se juegan solos o con otra carta.</li>
        </ul>

        <h2>Poderes de palo</h2>
        <ul>
          <li><strong>♥ Corazones</strong> — recupera del descarte bajo la Taverna.</li>
          <li><strong>♦ Diamantes</strong> — roba cartas.</li>
          <li><strong>♣ Tréboles</strong> — el daño cuenta doble.</li>
          <li><strong>♠ Picas</strong> — escudo que reduce el ataque del enemigo.</li>
        </ul>

        <h2>Enemigos</h2>
        <ul>
          <li>Jota 10/20 · Reina 15/30 · Rey 20/40 (ataque/vida).</li>
          <li>El enemigo es inmune al poder de su palo; los Jesters anulan esa inmunidad.</li>
          <li>Kill exacto: el enemigo va al tope de la Taverna boca abajo.</li>
        </ul>

        <h2>En solitario</h2>
        <ul>
          <li>Mano máxima de 8 cartas y 2 Jesters al costado.</li>
          <li>El Jester descarta tu mano y recarga a 8 (2 veces por partida).</li>
          <li>Victoria con 0/1/2 Jesters: Oro, Plata o Bronce.</li>
        </ul>
      </div>
      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        ← Volver
      </button>
      <p className="credits">
        Reglas citadas del PDF oficial de Badgers From Mars, adaptadas a mazo estándar
        (ver docs/rules-source.md).
      </p>
    </div>
  );
}
