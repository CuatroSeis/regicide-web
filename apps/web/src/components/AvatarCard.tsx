import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

/** Íconos de perfil (game-icons.net, CC-BY 3.0) servidos desde /avatars/<id>.svg. */
export type AvatarId =
  | 'barbarian'
  | 'barbute'
  | 'brutal-helm'
  | 'cowled'
  | 'crowned-skull'
  | 'cultist'
  | 'diablo-skull'
  | 'dragon-head'
  | 'dwarf-face'
  | 'dwarf-helmet'
  | 'dwarf-king'
  | 'elf-helmet'
  | 'executioner-hood'
  | 'fish-monster'
  | 'goblin-head'
  | 'golem-head'
  | 'kenku-head'
  | 'monk-face'
  | 'nun-face'
  | 'ogre'
  | 'orc-head'
  | 'overlord-helm'
  | 'troll'
  | 'vampire-dracula'
  | 'visored-helm'
  | 'warlock-hood'
  | 'witch-face'
  | 'wizard-face'
  | 'woman-elf-face';

export const AVATAR_IDS: readonly AvatarId[] = [
  'barbarian',
  'barbute',
  'brutal-helm',
  'cowled',
  'crowned-skull',
  'cultist',
  'diablo-skull',
  'dragon-head',
  'dwarf-face',
  'dwarf-helmet',
  'dwarf-king',
  'elf-helmet',
  'executioner-hood',
  'fish-monster',
  'goblin-head',
  'golem-head',
  'kenku-head',
  'monk-face',
  'nun-face',
  'ogre',
  'orc-head',
  'overlord-helm',
  'troll',
  'vampire-dracula',
  'visored-helm',
  'warlock-hood',
  'witch-face',
  'wizard-face',
  'woman-elf-face',
];

const AVATAR_LABEL_KEY: Record<AvatarId, TranslationKey> = {
  barbarian: 'avatarBarbarian',
  barbute: 'avatarBarbute',
  'brutal-helm': 'avatarBrutalHelm',
  cowled: 'avatarCowled',
  'crowned-skull': 'avatarCrownedSkull',
  cultist: 'avatarCultist',
  'diablo-skull': 'avatarDiabloSkull',
  'dragon-head': 'avatarDragonHead',
  'dwarf-face': 'avatarDwarfFace',
  'dwarf-helmet': 'avatarDwarfHelmet',
  'dwarf-king': 'avatarDwarfKing',
  'elf-helmet': 'avatarElfHelmet',
  'executioner-hood': 'avatarExecutionerHood',
  'fish-monster': 'avatarFishMonster',
  'goblin-head': 'avatarGoblinHead',
  'golem-head': 'avatarGolemHead',
  'kenku-head': 'avatarKenkuHead',
  'monk-face': 'avatarMonkFace',
  'nun-face': 'avatarNunFace',
  ogre: 'avatarOgre',
  'orc-head': 'avatarOrcHead',
  'overlord-helm': 'avatarOverlordHelm',
  troll: 'avatarTroll',
  'vampire-dracula': 'avatarVampireDracula',
  'visored-helm': 'avatarVisoredHelm',
  'warlock-hood': 'avatarWarlockHood',
  'witch-face': 'avatarWitchFace',
  'wizard-face': 'avatarWizardFace',
  'woman-elf-face': 'avatarWomanElfFace',
};

interface AvatarCardProps {
  avatarId: AvatarId;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function AvatarCard({ avatarId, size = 48, selected, onClick }: AvatarCardProps) {
  const { t } = useLanguage();
  const label = t(AVATAR_LABEL_KEY[avatarId]);
  const className = selected ? 'avatar-card avatar-card--selected' : 'avatar-card';
  const img = (
    <img
      src={`/avatars/${avatarId}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={{ width: size, height: size }}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={label}
      >
        {img}
      </button>
    );
  }

  return (
    <span
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {img}
    </span>
  );
}
