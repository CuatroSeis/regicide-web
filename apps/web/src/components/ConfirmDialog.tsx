import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
      <div className="overlay-card">
        <h2 className="overlay-title" id="confirm-title">{title}</h2>
        <p className="overlay-subtitle" id="confirm-body">{body}</p>
        <div className="overlay-actions">
          <button type="button" className="menu-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="back-button" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
