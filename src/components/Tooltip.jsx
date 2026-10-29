import { cloneElement, isValidElement } from 'react';
import { FiInfo } from 'react-icons/fi';

export default function Tooltip({ content, text, children, className = '', mode = 'both', placement, delay, disabled = false }) {
  const label = content || text;
  if (!label || disabled) return children;

  const trigger = isValidElement(children)
    && children.type === 'button'
    && !children.props['aria-label']
    && !children.props.title
    ? cloneElement(children, { 'aria-label': label })
    : children;

  if (mode === 'permanent') {
    return (
      <span className={`somane-help-text ${className}`.trim()}>
        {trigger}
        <span className="somane-help-text__content">
          <FiInfo size={14} aria-hidden="true" />
          <span>{label}</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`somane-tooltip ${className}`.trim()}
      data-somane-tooltip={label}
      data-somane-tooltip-trigger={mode === 'hover' ? 'hover' : mode === 'keyboard' ? 'focus' : 'both'}
      data-somane-tooltip-placement={placement}
      data-somane-tooltip-delay={delay}
    >
      {trigger}
    </span>
  );
}
