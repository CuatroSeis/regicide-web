export type Screen =
  | 'auth'
  | 'forgot-password'
  | 'home'
  | 'rules'
  | 'setup'
  | 'game'
  | 'room'
  | 'online-game'
  | 'leaderboard'
  | 'profile';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
}
