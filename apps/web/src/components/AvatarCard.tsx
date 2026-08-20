import { SPRITE_PATH } from '../lib/cardAssets';

export type AvatarId = 'jack' | 'queen' | 'king' | 'joker' | 'ace';

export const AVATAR_IDS: readonly AvatarId[] = ['jack', 'queen', 'king', 'joker', 'ace'];

const AVATAR_SPRITE: Record<AvatarId, string> = {
  jack: 'jack',
  queen: 'queen',
  king: 'king',
  joker: 'joker_full',
  ace: 'ace',
};

interface AvatarCardProps {
  avatarId: AvatarId;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function AvatarCard({ avatarId, size = 48, selected, onClick }: AvatarCardProps) {
  const spriteId = AVATAR_SPRITE[avatarId];
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
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <use href={`${SPRITE_PATH}#${spriteId}`} />
        </svg>
      </button>
    );
  }

  return (
    <span className={className} style={{ width: size, height: size }} aria-label={avatarId}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <use href={`${SPRITE_PATH}#${spriteId}`} />
      </svg>
    </span>
  );
}
