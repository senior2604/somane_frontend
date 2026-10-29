import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMoreHorizontal } from 'react-icons/fi';

const MENU_WIDTH = 280;
const VIEWPORT_GAP = 8;

export default function ColumnVisibilityMenu({
  columns,
  isVisible,
  onToggle,
  title = 'Colonnes',
  allowEmpty = false,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
    const top = rect.bottom + 5;
    const left = Math.max(VIEWPORT_GAP, Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_GAP));
    setPosition({ left, top, maxHeight: `calc(100vh - ${top + VIEWPORT_GAP}px)` });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const onOutsideClick = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="somane-column-menu-trigger"
        aria-label="Afficher ou masquer les colonnes"
        aria-expanded={open}
        title="Afficher ou masquer les colonnes"
      >
        <FiMoreHorizontal size={17} />
      </button>
      {open && position && createPortal(
        <div
          ref={menuRef}
          onClick={(event) => event.stopPropagation()}
          style={{ position: 'fixed', ...position }}
          className="somane-popover somane-column-menu"
        >
          <div className="somane-column-menu__title">{title}</div>
          {columns.map((column) => {
            const checked = isVisible(column.key);
            const visibleCount = columns.filter((item) => isVisible(item.key)).length;
            return (
              <label key={column.key} className="somane-column-menu__option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={column.disabled || (!allowEmpty && checked && visibleCount === 1)}
                  onChange={() => onToggle(column.key)}
                  className="somane-column-menu__checkbox"
                />
                <span>{column.label}</span>
              </label>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
