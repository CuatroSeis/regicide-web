import { useState } from 'react';
import type { Screen } from './navigation';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { GameScreen } from './screens/GameScreen';
import { RoomScreen } from './screens/RoomScreen';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');

  switch (screen) {
    case 'rules':
      return <RulesScreen onNavigate={setScreen} />;
    case 'game':
      return <GameScreen onNavigate={setScreen} />;
    case 'room':
      return <RoomScreen onNavigate={setScreen} />;
    case 'home':
    default:
      return <HomeScreen onNavigate={setScreen} />;
  }
}
