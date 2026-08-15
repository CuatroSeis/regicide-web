import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import type { Screen } from './navigation';
import { useOnlineGame } from './hooks/useOnlineGame';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { SetupScreen } from './screens/SetupScreen';
import type { SoloSetup } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { RoomScreen } from './screens/RoomScreen';
import { OnlineGameScreen } from './screens/OnlineGameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [solo, setSolo] = useState<SoloSetup | null>(null);
  const online = useOnlineGame();
  const { room, myPlayerId } = online;
  const started = room?.started ?? false;

  // Si la sala comenzó, el lobby pasa al tablero online automáticamente.
  const current: Screen = screen === 'room' && started ? 'online-game' : screen;

  // Tras recargar la pestaña con una sesión activa, la partida iniciada se
  // reanuda directo al tablero (el rejoin restaura la sala al conectar).
  useEffect(() => {
    if (started && myPlayerId && screen === 'home') {
      setScreen('online-game');
    }
  }, [started, myPlayerId, screen, setScreen]);

  switch (current) {
    case 'rules':
      return <RulesScreen onNavigate={setScreen} />;
    case 'setup':
      return (
        <SetupScreen
          onNavigate={setScreen}
          onStart={(setup) => {
            setSolo(setup);
            setScreen('game');
          }}
        />
      );
    case 'game':
      return solo ? (
        <GameScreen
          key={solo.seed}
          setup={solo}
          onRestart={() => setSolo({ name: solo.name, seed: randomSeed() })}
          onHome={() => setScreen('home')}
          onViewLeaderboard={() => setScreen('leaderboard')}
        />
      ) : (
        <HomeScreen onNavigate={setScreen} />
      );
    case 'room':
      return <RoomScreen online={online} onNavigate={setScreen} />;
    case 'online-game':
      return <OnlineGameScreen online={online} onNavigate={setScreen} />;
    case 'leaderboard':
      return <LeaderboardScreen onNavigate={setScreen} />;
    case 'home':
    default:
      return <HomeScreen onNavigate={setScreen} />;
  }
}

export function AppWithMotion() {
  return (
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  );
}
