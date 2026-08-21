import { SPRITE_PATH, AVATAR_ART } from '../lib/cardAssets';

export type AvatarId = 'jack' | 'queen' | 'king' | 'joker' | 'ace';

export const AVATAR_IDS: readonly AvatarId[] = ['jack', 'queen', 'king', 'joker', 'ace'];

interface AvatarCardProps {
  avatarId: AvatarId;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function AvatarCard({ avatarId, size = 48, selected, onClick }: AvatarCardProps) {
  const art = AVATAR_ART[avatarId];
  const isButton = Boolean(onClick);
  const className = selected ? 'avatar-card avatar-card--selected' : 'avatar-card';

  if (isButton) {
    return (
      <button
        type="button"
        className={className}
        style={{ width: size, height: size }}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={avatarId}
      >
        <svg viewBox={art.viewBox} width={size} height={size} aria-hidden="true">
          <use href={`${SPRITE_PATH}#${art.spriteId}`} />
        </svg>
      </button>
    );
  }

  return (
    <span className={className} style={{ width: size, height: size }} aria-label={avatarId}>
      <svg viewBox={art.viewBox} width={size} height={size} aria-hidden="true">
        <use href={`${SPRITE_PATH}#${art.spriteId}`} />
      </svg>
    </span>
  );
}
