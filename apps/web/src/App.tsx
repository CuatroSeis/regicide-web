import { useState } from 'react';
import type { Screen } from './navigation';
import { useOnlineGame } from './hooks/useOnlineGame';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { GameScreen } from './screens/GameScreen';
import { RoomScreen } from './screens/RoomScreen';
import { OnlineGameScreen } from './screens/OnlineGameScreen';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const online = useOnlineGame();

  // Si la sala comenzó, el lobby pasa al tablero online automáticamente.
  const current: Screen = screen === 'room' && online.room?.started ? 'online-game' : screen;

  switch (current) {
    case 'rules':
      return <RulesScreen onNavigate={setScreen} />;
    case 'game':
      return <GameScreen onNavigate={setScreen} />;
    case 'room':
      return <RoomScreen online={online} onNavigate={setScreen} />;
    case 'online-game':
      return <OnlineGameScreen online={online} onNavigate={setScreen} />;
    case 'home':
    default:
      return <HomeScreen onNavigate={setScreen} />;
  }
}
