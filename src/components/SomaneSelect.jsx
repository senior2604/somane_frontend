import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';

const collectOptions = (children, result = []) => {
  if (Array.isArray(children)) {
    children.forEach((child) => collectOptions(child, result));
    return result;
  }
  if (!children) return result;
  if (typeof children !== 'object') return result;
  if (children.type === Symbol.for('react.fragment')) {
    collectOptions(children.props.children, result);
    return result;
  }
  if (children.type === 'option') {
    const optionValue = children.props.value ?? children.props.children;
    result.push({
      key: children.key ?? String(optionValue),
      value: String(optionValue ?? ''),
      label: children.props.children,
      disabled: Boolean(children.props.disabled),
    });
  }
  return result;
};

const getText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join(' ');
  if (node.props?.children) return getText(node.props.children);
  return '';
};

export default function SomaneSelect({
  children,
  value,
  defaultValue,
  onChange,
  className = '',
  style,
  disabled = false,
  required = false,
  name,
  id,
  title,
  'aria-label': ariaLabel,
  ...ariaProps
}) {
  const options = useMemo(() => collectOptions(children), [children]);
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();
  const controlled = value !== undefined;
  const selectedValue = String(controlled ? value ?? '' : internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue);

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const viewportPadding = 8;
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
    setPlacement({
      left,
      width,
      maxHeight: Math.max(0, Math.min(240, roomBelow)),
      top: rect.bottom + gap,
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const show = useCallback((preferredIndex) => {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    const nextIndex = preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled));
    setActiveIndex(nextIndex);
    setOpen(true);
  }, [disabled, options, selectedValue]);

  useEffect(() => {
    if (!open) return undefined;
    updatePlacement();
    const handleViewportChange = () => updatePlacement();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.querySelector(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = (option) => {
    if (!option || option.disabled) return;
    if (!controlled) setInternalValue(option.value);
    const target = { value: option.value, name: name || '', selectedOptions: [] };
    if (onChange) onChange({ target, currentTarget: target, type: 'change' });
    close();
  };

  const moveActive = (direction) => {
    const enabledIndexes = options.map((option, index) => (!option.disabled ? index : -1)).filter((index) => index >= 0);
    if (!enabledIndexes.length) return;
    const currentPosition = enabledIndexes.indexOf(activeIndex);
    const nextPosition = currentPosition < 0
      ? (direction > 0 ? 0 : enabledIndexes.length - 1)
      : (currentPosition + direction + enabledIndexes.length) % enabledIndexes.length;
    if (!open) setOpen(true);
    setActiveIndex(enabledIndexes[nextPosition]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault();
      show();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab' && open) {
      close();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const startIndex = options.findIndex((option) => option.value === selectedValue);
      const query = event.key.toLocaleLowerCase();
      const matchIndex = [...options.slice(startIndex + 1), ...options.slice(0, startIndex + 1)]
        .find((option) => !option.disabled && getText(option.label).trim().toLocaleLowerCase().startsWith(query));
      if (matchIndex) {
        const index = options.indexOf(matchIndex);
        if (open) setActiveIndex(index);
        else choose(matchIndex);
      }
    }
  };

  return (
    <>
      {name && !disabled && <input type="hidden" name={name} value={selectedValue} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        title={title}
        disabled={disabled}
        className={`somane-dropdown-trigger ${className}`.trim()}
        style={style}
        onClick={() => (open ? close() : show())}
        onKeyDown={handleKeyDown}
        {...ariaProps}
      >
        <span className="somane-select__value">{selectedOption?.label ?? '\u00a0'}</span>
        <FiChevronDown className="somane-select__chevron" aria-hidden="true" />
      </button>
      {open && placement && createPortal(
        <div
          ref={listRef}
          id={listboxId}
          className="somane-popover somane-select__menu"
          role="listbox"
          style={{ ...placement, maxHeight: placement.maxHeight }}
        >
          {options.map((option, index) => (
            <button
              key={option.key}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              aria-disabled={option.disabled || undefined}
              data-option-index={index}
              className={`somane-select__option${index === activeIndex ? ' is-active' : ''}${option.disabled ? ' is-disabled' : ''}`}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
