export type Screen = 'home' | 'rules' | 'game' | 'room' | 'online-game';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
}
