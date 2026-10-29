const STATUS_CLASS_BY_ID = {
  draft: 'draft',
  processing: 'processing',
  in_progress: 'in-progress',
  running: 'in-progress',
  waiting: 'waiting',
  paid: 'paid',
  completed: 'paid',
  done: 'paid',
  posted: 'paid',
  closed: 'paid',
  cancelled: 'cancelled',
  cancel: 'cancelled',
  disposed: 'cancelled',
  archived: 'archived',
  error: 'error',
  failed: 'error',
};

export default function StatusTrack({ steps, currentState, label = 'États du document', className = '' }) {
  return (
    <div className={`somane-status-track ${className}`.trim()} role="group" aria-label={label}>
      {steps.map((step) => {
        const id = typeof step === 'string' ? step : step.id;
        const stepLabel = typeof step === 'string' ? step : step.label;
        const isCurrent = id === currentState;
        const statusClass = STATUS_CLASS_BY_ID[id];

        return (
          <span
            key={id}
            className={`somane-status-track__item${isCurrent && statusClass ? ` somane-status-track__item--${statusClass}` : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {isCurrent && <span className="somane-status-track__dot" aria-hidden="true" />}
            {stepLabel}
          </span>
        );
      })}
    </div>
  );
}
