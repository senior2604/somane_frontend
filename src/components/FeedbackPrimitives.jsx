import React, { useEffect, useId, useRef, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiLoader, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';

const messageIcons = { error: FiAlertCircle, warning: FiAlertTriangle, success: FiCheckCircle, info: FiInfo };
const dialogPresets = {
  validation: { title: 'Confirmer l’action', severity: 'info', confirmLabel: 'Valider', cancelLabel: 'Annuler' },
  warning: { title: 'Attention', severity: 'warning', confirmLabel: 'Continuer', cancelLabel: 'Annuler' },
  deletion: { title: 'Confirmer la suppression', severity: 'error', confirmLabel: 'Supprimer', cancelLabel: 'Annuler' },
  information: { title: 'Information', severity: 'info', confirmLabel: 'Compris', showCancel: false },
};

export function FormMessage({ fieldId, id, severity = 'error', children }) {
  if (!children) return null;
  const Icon = messageIcons[severity] || FiInfo;
  return (
    <div id={id || (fieldId ? `${fieldId}-message` : undefined)} className={`somane-form-message somane-form-message--${severity}`} role={severity === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
      {fieldId && (
        <a
          href={`#${fieldId}`}
          className="somane-form-message__link"
          onClick={() => {
            window.requestAnimationFrame(() => {
              const field = document.getElementById(fieldId);
              field?.focus({ preventScroll: true });
              field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
          }}
        >
          Voir le champ
        </a>
      )}
    </div>
  );
}

export function LoadingIndicator({ label = 'Chargement…', size = 'normal', className = '' }) {
  return (
    <span className={`somane-loading somane-loading--${size} ${className}`.trim()} role="status" aria-busy="true">
      <FiLoader aria-hidden="true" className="somane-loading__icon" />
      <span>{label}</span>
    </span>
  );
}

export function Skeleton({ variant = 'text', count = 1, widths, className = '' }) {
  const rows = Math.max(1, Math.min(12, Number(count) || 1));
  return (
    <div className={`somane-skeleton-group ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className={`somane-skeleton somane-skeleton--${variant}`} style={Array.isArray(widths) && widths[index] ? { width: widths[index] } : undefined} />
      ))}
    </div>
  );
}

export function FeedbackState({
  kind = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  layout = 'list',
  columns = 5,
}) {
  const isLoading = kind === 'loading';
  const isError = kind === 'error';
  const Icon = isError ? FiAlertCircle : FiSearch;
  const label = isLoading ? 'Chargement' : isError ? 'Erreur' : 'Aucun résultat';
  const safeColumns = Math.max(1, Math.min(12, Number(columns) || 5));

  return (
    <section
      className={`somane-view-state somane-view-state--${kind} somane-view-state--${layout}`}
      role={isError ? 'alert' : 'status'}
      aria-busy={isLoading || undefined}
    >
      <header className="somane-view-state__header">
        <span className="somane-view-state__marker" aria-hidden="true" />
        <h2>{label}</h2>
      </header>
      {isLoading && description && <p className="somane-view-state__description">{description}</p>}
      <div className="somane-view-state__body">
        {isLoading ? (
          <>
            {layout === 'table' ? (
              <div className="somane-view-state__table-skeleton" style={{ '--state-columns': safeColumns }} aria-hidden="true">
                {Array.from({ length: 12 }, (_, row) => (
                  <div className="somane-view-state__skeleton-row" key={row}>
                    {Array.from({ length: safeColumns }, (_, column) => (
                      <span className="somane-skeleton somane-skeleton--text" key={column} />
                    ))}
                  </div>
                ))}
              </div>
            ) : layout === 'kanban' ? (
              <div className="somane-view-state__kanban-skeleton" aria-hidden="true">
                {Array.from({ length: 6 }, (_, card) => (
                  <div className="somane-view-state__skeleton-card" key={card}>
                    <Skeleton variant="title" />
                    <Skeleton variant="text" count={3} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="somane-view-state__form-skeleton" aria-hidden="true">
                <Skeleton variant="title" />
                <Skeleton variant="text" count={4} widths={['100%', '86%', '100%', '68%']} />
              </div>
            )}
            <div className="somane-view-state__loading-label">
              <span className="somane-view-state__spinner" aria-hidden="true" />
              <span>{title || 'Chargement des données…'}</span>
            </div>
          </>
        ) : (
          <div className="somane-view-state__message">
            <span className={`somane-view-state__icon${isError ? ' is-error' : ''}`} aria-hidden="true"><Icon /></span>
            <h3>{title || (isError ? 'Impossible de charger les données' : 'Aucune donnée trouvée')}</h3>
            {description && <p>{description}</p>}
            {onAction && actionLabel && (
              <button type="button" className="somane-view-state__action" onClick={onAction}>
                {isError && <FiRefreshCw aria-hidden="true" />}
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProgressIndicator({ value, label, indeterminate = false }) {
  const normalized = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <div className="somane-progress" role="progressbar" aria-label={label || 'Progression'} aria-valuemin={0} aria-valuemax={100} {...(!indeterminate ? { 'aria-valuenow': normalized } : {})}>
      <span className={`somane-progress__bar${indeterminate ? ' somane-progress__bar--indeterminate' : ''}`} style={indeterminate ? undefined : { width: `${normalized}%` }} />
    </div>
  );
}

export function OperationIndicator({ title = 'Traitement en cours', description, progress, onCancel, cancelLabel = 'Annuler', startedAt }) {
  const startTime = useRef(startedAt ? new Date(startedAt).getTime() : Date.now());
  const [elapsed, setElapsed] = useState(0);
  const hasProgress = progress !== undefined && progress !== null && Number.isFinite(Number(progress));
  const normalizedProgress = hasProgress ? Math.max(0, Math.min(100, Number(progress))) : undefined;

  useEffect(() => {
    startTime.current = startedAt ? new Date(startedAt).getTime() : Date.now();
    const updateElapsed = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime.current) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const elapsedLabel = elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min ${String(elapsed % 60).padStart(2, '0')} s`;
  return (
    <section className="somane-operation" role="status" aria-live="polite" aria-busy="true">
      <div className="somane-operation__heading">
        <LoadingIndicator label="" size="compact" />
        <div className="somane-operation__copy">
          <strong>{title}</strong>
          {description && <span>{description}</span>}
        </div>
        <span className="somane-operation__elapsed">{elapsed >= 5 ? elapsedLabel : 'En cours…'}</span>
        {onCancel && <button type="button" className="somane-operation__cancel" onClick={onCancel}>{cancelLabel}</button>}
      </div>
      <ProgressIndicator value={normalizedProgress} label={title} indeterminate={!hasProgress} />
      {hasProgress && <span className="somane-operation__percent">{normalizedProgress}%</span>}
    </section>
  );
}

export function ConfirmDialog({ open, kind = 'validation', title, message, confirmLabel, cancelLabel, severity, showCancel, busy = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const headingId = useId();
  const messageId = useId();
  const preset = dialogPresets[kind] || dialogPresets.validation;
  const tone = messageIcons[severity] ? severity : preset.severity;
  const heading = title || preset.title;
  const primaryLabel = confirmLabel || preset.confirmLabel;
  const secondaryLabel = cancelLabel || preset.cancelLabel || 'Fermer';
  const displayCancel = showCancel ?? preset.showCancel ?? true;
  const Icon = messageIcons[tone] || FiInfo;
  const dismiss = onCancel || (kind === 'information' ? onConfirm : undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  return (
    <dialog ref={dialogRef} className={`somane-modal somane-dialog somane-dialog--${tone} somane-dialog--${kind}`} onCancel={(event) => { event.preventDefault(); if (!busy) dismiss?.(); }} aria-labelledby={headingId} aria-describedby={messageId}>
      <div className="somane-dialog__header">
        <div className="somane-dialog__heading">
          <Icon className="somane-dialog__icon" aria-hidden="true" />
          <h2 id={headingId} className="somane-dialog__title">{heading}</h2>
        </div>
        <button type="button" className="somane-dialog__close" aria-label="Fermer" onClick={dismiss} disabled={busy}><FiX /></button>
      </div>
      <div id={messageId} className="somane-dialog__body">{message}</div>
      <div className="somane-dialog__footer">
        {displayCancel && <button type="button" className="somane-btn somane-btn--secondary" onClick={onCancel} disabled={busy}>{secondaryLabel}</button>}
        <button type="button" className={`somane-btn ${kind === 'deletion' || tone === 'error' ? 'somane-btn--danger' : 'somane-btn--primary'}`} onClick={kind === 'information' ? (onConfirm || onCancel) : onConfirm} disabled={busy}>
          {busy ? <LoadingIndicator label="Traitement…" size="compact" /> : primaryLabel}
        </button>
      </div>
    </dialog>
  );
}
