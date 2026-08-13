import type { ScreenProps } from '../navigation';

export function RoomScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        Crear sala
      </h1>
      <p className="subtitle">Próximamente: multijugador online (2 o más jugadores)</p>
      <p className="credits">
        El modo online llegará en una fase futura con salas por código (Socket.io).
      </p>
      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        ← Volver al menú
      </button>
    </div>
  );
}
