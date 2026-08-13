import type { ScreenProps } from '../navigation';

export function GameScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        Partida en solitario
      </h1>
      <p className="subtitle">Próximamente: mesa de juego conectada al motor de reglas</p>
      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        ← Volver al menú
      </button>
    </div>
  );
}
