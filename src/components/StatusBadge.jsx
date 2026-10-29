const STATUS_TONE_BY_ID = {
  draft: 'draft',
  processing: 'in-progress',
  in_progress: 'in-progress',
  running: 'in-progress',
  confirmed: 'in-progress',
  waiting: 'waiting',
  pending: 'waiting',
  partial: 'waiting',
  partially_paid: 'waiting',
  paid: 'completed',
  posted: 'completed',
  closed: 'completed',
  completed: 'completed',
  done: 'completed',
  validated: 'completed',
  cancel: 'cancelled',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  disposed: 'cancelled',
  error: 'error',
  failed: 'error',
  rejected: 'error',
  archived: 'archived',
  archive: 'archived',
  deleted: 'archived',
  duplicated: 'neutral',
  reversal: 'neutral',
  reversed: 'neutral',
  not_paid: 'neutral',
};

export default function StatusBadge({ status, label, className = '' }) {
  const normalizedStatus = String(status || 'unknown').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const tone = STATUS_TONE_BY_ID[normalizedStatus] || 'neutral';
  const text = label || String(status || 'Inconnu');

  return (
    <span className={`somane-status-badge somane-status-badge--${tone} ${className}`.trim()}>
      {text}
    </span>
  );
}
