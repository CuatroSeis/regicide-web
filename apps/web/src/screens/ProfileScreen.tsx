import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import { useAuth, displayName, avatarId } from '../auth/AuthContext';
import { AvatarCard, AVATAR_IDS } from '../components/AvatarCard';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';

export function ProfileScreen({ onNavigate }: ScreenProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const currentName = displayName(user);
  const currentAvatar = avatarId(user);

  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  async function saveName() {
    if (!name.trim() || name.trim() === currentName) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setNameMsg(error ? t('profileError') : t('profileSuccess'));
  }

  async function saveEmail() {
    if (!email.trim() || email === user?.email) return;
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setEmailMsg(error ? t('profileError') : t('profileConfirmEmailSent'));
  }

  async function savePassword() {
    if (newPassword.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwMsg(error ? t('profileError') : t('profileSuccess'));
    if (!error) setNewPassword('');
  }

  async function saveAvatar(id: string) {
    setSelectedAvatar(id as typeof selectedAvatar);
    const { error } = await supabase.auth.updateUser({ data: { avatar_id: id } });
    setAvatarMsg(error ? t('profileError') : t('profileSuccess'));
  }

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
        {t('profileTitle')}
      </h1>

      <div className="form">
        <label htmlFor="profile-name">{t('profileName')}</label>
        <div className="form-row">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
          <button type="button" className="menu-button" onClick={saveName}>
            {t('profileSave')}
          </button>
        </div>
        {nameMsg && <span className="muted">{nameMsg}</span>}

        <label htmlFor="profile-email">{t('profileEmail')}</label>
        <div className="form-row">
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="menu-button" onClick={saveEmail}>
            {t('profileSendConfirm')}
          </button>
        </div>
        {emailMsg && <span className="muted">{emailMsg}</span>}

        <hr className="divider" />

        <label htmlFor="profile-password">{t('profilePassword')}</label>
        <div className="form-row">
          <input
            id="profile-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('authPasswordPlaceholder')}
            minLength={6}
            autoComplete="new-password"
          />
          <button type="button" className="menu-button" onClick={savePassword}>
            {t('profileChangePassword')}
          </button>
        </div>
        {pwMsg && <span className="muted">{pwMsg}</span>}

        <hr className="divider" />

        <p className="muted">{t('profileAvatar')}</p>
        <div className="avatar-row">
          {AVATAR_IDS.map((id) => (
            <AvatarCard
              key={id}
              avatarId={id}
              size={56}
              selected={selectedAvatar === id}
              onClick={() => saveAvatar(id)}
            />
          ))}
        </div>
        {avatarMsg && <span className="muted">{avatarMsg}</span>}
      </div>

      <button
        type="button"
        className="back-button"
        style={{ marginTop: '1.5rem' }}
        onClick={signOut}
      >
        {t('profileLogout')}
      </button>

      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        {t('profileBack')}
      </button>
    </div>
  );
}
