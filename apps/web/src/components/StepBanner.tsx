import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';

interface StepBannerProps {
  /** Título grande (p. ej. "Paso 1" o "Espera tu turno…"). */
  title: string;
  /** Texto completo desplegable (descripción del paso). */
  description?: string;
  /** Últimas líneas del log (dentro del panel desplegado). */
  log?: string[];
  /** Estado de espera: título tenue, sin acento. */
  waiting?: boolean;
}

export function StepBanner({ title, description, log = [], waiting = false }: StepBannerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(description) || log.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="step-banner" aria-live="polite">
      <div className="step-banner-head">
        <span
          className={
            waiting ? 'step-banner-title step-banner-title--wait' : 'step-banner-title'
          }
        >
          {title}
        </span>
        {hasDetails && (
          <button
            type="button"
            className="step-banner-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t('detailsLess') : t('detailsMore')}
            <span className="step-banner-chevron" aria-hidden="true">
              {open ? '−' : '+'}
            </span>
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="step-banner-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {description && <p className="step-banner-desc">{description}</p>}
            {log.length > 0 && (
              <div className="step-banner-log">
                <span className="step-banner-log-title">{t('logTitle')}</span>
                {log.map((entry, index) => (
                  <div key={index} className="log-line">
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
