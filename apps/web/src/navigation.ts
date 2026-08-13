export type Screen = 'home' | 'rules' | 'game' | 'room';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
}
