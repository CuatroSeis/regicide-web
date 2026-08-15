export type Screen = 'home' | 'rules' | 'setup' | 'game' | 'room' | 'online-game' | 'leaderboard';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
}
