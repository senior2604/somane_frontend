import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_ID = 'somane-global-tooltip';

const moveNativeTitles = (root) => {
  const candidates = [];
  if (root instanceof Element && root.hasAttribute('title')) candidates.push(root);
  if (root.querySelectorAll) candidates.push(...root.querySelectorAll('[title]'));
  candidates.forEach((element) => {
    if (element.matches('input[pattern][title], textarea[pattern][title]')) return;
    element.setAttribute('data-somane-tooltip', element.getAttribute('title') || '');
    element.removeAttribute('title');
  });
};

const findTarget = (eventTarget) => {
  const element = eventTarget instanceof Element ? eventTarget : eventTarget?.parentElement;
  if (!element) return null;
  return element.closest('[data-somane-tooltip], [data-tooltip], [title]')
    || element.closest('button[aria-label]');
};

const iconButtonLabel = (target) => {
  if (!target?.matches('button[aria-label]') || target.textContent.trim()) return '';
  return target.querySelector('svg, img') ? target.getAttribute('aria-label') || '' : '';
};

const isDropdownOpenFor = (target) => Boolean(
  target?.closest('[data-somane-dropdown-open="true"], [aria-expanded="true"]')
);

export default function GlobalTooltipLayer() {
  const [active, setActive] = useState(null);
  const [positioned, setPositioned] = useState(false);
  const activeTargetRef = useRef(null);
  const pendingTargetRef = useRef(null);
  const pendingTimerRef = useRef(null);
  const originalDescriptionRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    moveNativeTitles(document.body);
    const titleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') moveNativeTitles(mutation.target);
        else mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) moveNativeTitles(node);
        });
      });
    });
    titleObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    const positionForTarget = () => {
      window.requestAnimationFrame(() => {
        const target = activeTargetRef.current;
        const node = tooltipRef.current;
        if (!target || !node) return;

        const rect = target.getBoundingClientRect();
        const width = Math.min(node.offsetWidth || 320, window.innerWidth - 16);
        const height = node.offsetHeight || 40;
        const gap = 8;
        const margin = 8;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const preference = target.getAttribute('data-somane-tooltip-placement')
          || target.closest('[data-somane-tooltip-placement]')?.getAttribute('data-somane-tooltip-placement')
          || document.documentElement.dataset.tooltipPlacement
          || 'auto';
        const candidates = preference === 'auto'
          ? ['bottom', 'top', 'right', 'left']
          : [preference, ...['bottom', 'top', 'right', 'left'].filter((place) => place !== preference)];
        const available = {
          top: rect.top - margin - gap,
          bottom: window.innerHeight - rect.bottom - margin - gap,
          left: rect.left - margin - gap,
          right: window.innerWidth - rect.right - margin - gap,
        };
        const fits = (place) => (place === 'top' || place === 'bottom'
          ? available[place] >= height
          : available[place] >= width);
        const placement = candidates.find(fits)
          || candidates.reduce((best, place) => {
            const dimension = place === 'top' || place === 'bottom' ? height : width;
            const bestDimension = best === 'top' || best === 'bottom' ? height : width;
            return available[place] / dimension > available[best] / bestDimension ? place : best;
          });
        let left = centerX - width / 2;
        let top = centerY - height / 2;
        if (placement === 'bottom') top = rect.bottom + gap;
        if (placement === 'top') top = rect.top - height - gap;
        if (placement === 'right') left = rect.right + gap;
        if (placement === 'left') left = rect.left - width - gap;
        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
        node.style.setProperty('--somane-tooltip-arrow-x', `${Math.max(12, Math.min(centerX - left, width - 12))}px`);
        node.style.setProperty('--somane-tooltip-arrow-y', `${Math.max(12, Math.min(centerY - top, height - 12))}px`);
        node.dataset.placement = placement;
        setPositioned(true);
      });
    };

    const cancelPending = () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
      pendingTargetRef.current = null;
    };

    const restoreActiveTarget = () => {
      cancelPending();
      const target = activeTargetRef.current;
      if (target) {
        if (originalDescriptionRef.current) target.setAttribute('aria-describedby', originalDescriptionRef.current);
        else target.removeAttribute('aria-describedby');
      }
      activeTargetRef.current = null;
      originalDescriptionRef.current = null;
      setPositioned(false);
      setActive(null);
    };

    const show = (target, focused = false, owner = target) => {
      const preferences = document.documentElement.dataset.tooltips || 'always';
      if (preferences === 'off' || (preferences === 'focus' && !focused)) return;
      const triggerMode = owner.getAttribute('data-somane-tooltip-trigger') || 'both';
      if ((focused && triggerMode === 'hover') || (!focused && triggerMode === 'focus') || isDropdownOpenFor(target)) {
        if (activeTargetRef.current === target) restoreActiveTarget();
        cancelPending();
        return;
      }
      const text = owner.getAttribute('data-somane-tooltip')
        || owner.getAttribute('data-tooltip')
        || target.getAttribute('data-somane-tooltip')
        || target.getAttribute('data-tooltip')
        || target.getAttribute('title')
        || iconButtonLabel(target);
      if (!text?.trim()) return;

      if (activeTargetRef.current === target) return;
      if (pendingTargetRef.current === target) return;

      cancelPending();
      if (activeTargetRef.current) restoreActiveTarget();

      const display = () => {
        pendingTimerRef.current = null;
        pendingTargetRef.current = null;
        if (!target.isConnected) return;

        activeTargetRef.current = target;
        originalDescriptionRef.current = target.getAttribute('aria-describedby');
        const describedBy = [originalDescriptionRef.current, TOOLTIP_ID].filter(Boolean).join(' ');
        target.setAttribute('aria-describedby', describedBy);
        setPositioned(false);
        setActive({ text, focused });
        positionForTarget();
      };

      const delayValue = owner.getAttribute('data-somane-tooltip-delay');
      const delay = Math.max(0, Number(delayValue ?? document.documentElement.dataset.tooltipDelay) || 0);
      if (!delay) display();
      else {
        pendingTargetRef.current = target;
        pendingTimerRef.current = window.setTimeout(display, delay);
      }
    };

    const onPointerOver = (event) => {
      if (event.pointerType === 'touch') return;
      const target = findTarget(event.target);
      if (target) show(target, false);
    };

    const onPointerOut = (event) => {
      const pendingTarget = pendingTargetRef.current;
      if (pendingTarget && (event.target === pendingTarget || pendingTarget.contains(event.target))
        && !(event.relatedTarget instanceof Node && pendingTarget.contains(event.relatedTarget))) {
        cancelPending();
      }
      const target = activeTargetRef.current;
      if (!target || (event.target !== target && !target.contains(event.target))) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      if (document.activeElement && target.contains(document.activeElement)) return;
      restoreActiveTarget();
    };

    const onFocusIn = (event) => {
      const owner = findTarget(event.target);
      if (owner) show(event.target instanceof Element ? event.target : owner, true, owner);
    };

    const onFocusOut = (event) => {
      const target = activeTargetRef.current;
      if (target && (event.target === target || target.contains(event.target))
        && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) {
        restoreActiveTarget();
      }
    };

    const onClick = () => {
      // A click may focus a control before its click event; never leave that tooltip open.
      if (activeTargetRef.current || pendingTargetRef.current) restoreActiveTarget();
    };

    const reposition = () => {
      if (activeTargetRef.current) positionForTarget();
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      titleObserver.disconnect();
      const target = activeTargetRef.current;
      if (target) {
        if (originalDescriptionRef.current) target.setAttribute('aria-describedby', originalDescriptionRef.current);
        else target.removeAttribute('aria-describedby');
      }
    };
  }, []);

  const layer = (
    <div
      id={TOOLTIP_ID}
      ref={tooltipRef}
      className={`somane-global-tooltip${active && positioned ? ' is-visible' : ''}${active?.focused ? ' is-focused' : ''}`}
      role="tooltip"
      aria-hidden={!active}
    >
      {active?.text}
    </div>
  );

  return typeof document === 'undefined' ? layer : createPortal(layer, document.body);
}
