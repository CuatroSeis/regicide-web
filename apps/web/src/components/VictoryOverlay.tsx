interface VictoryOverlayProps {
  victory: boolean;
  victoryLevel: 'gold' | 'silver' | 'bronze' | null;
  onNewGame: () => void;
  onHome: () => void;
}

const MEDAL: Record<'gold' | 'silver' | 'bronze', { emoji: string; label: string }> = {
  gold: { emoji: '🥇', label: 'Victoria de Oro' },
  silver: { emoji: '🥈', label: 'Victoria de Plata' },
  bronze: { emoji: '🥉', label: 'Victoria de Bronce' },
};

export function VictoryOverlay({ victory, victoryLevel, onNewGame, onHome }: VictoryOverlayProps) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        {victory ? (
          <>
            <div className="overlay-emoji">
              {victoryLevel ? MEDAL[victoryLevel].emoji : '👑'}
            </div>
            <h2 className="overlay-title">
              {victoryLevel ? MEDAL[victoryLevel].label : '¡Victoria!'}
            </h2>
            <p className="overlay-subtitle">
              Derrotaste al último Rey del castillo. [R-23][R-25]
            </p>
          </>
        ) : (
          <>
            <div className="overlay-emoji">💀</div>
            <h2 className="overlay-title">Derrota</h2>
            <p className="overlay-subtitle">
              Te quedaste sin cartas y sin Jester para continuar. El castillo gana. [R-25]
            </p>
          </>
        )}
        <div className="overlay-actions">
          <button type="button" className="menu-button" onClick={onNewGame}>
            Jugar de nuevo
          </button>
          <button type="button" className="back-button" onClick={onHome}>
            Volver al menú
          </button>
        </div>
      </div>
    </div>
  );
}
