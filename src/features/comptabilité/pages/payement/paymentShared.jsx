import { useCallback, useEffect, useRef, useState } from 'react';

export const normalizeApiList = (data) => (Array.isArray(data) ? data : (data?.results || []));

export const getActiveEntityId = () => {
  const raw = localStorage.getItem('entiteActive');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return parsed?.id || raw;
  } catch {
    return raw;
  }
};

export const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const optionLabel = (item, fields = ['code', 'name']) => {
  if (!item) return '';
  return fields.map((field) => item[field]).filter(Boolean).join(' - ') || item.display_name || item.nom || item.label || '';
};

export const getActionErrorMessage = (err, fallback) => {
  const data = err?.response?.data || err?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data) return JSON.stringify(data);
  return err?.message || fallback;
};

export const PAGE_SIZE_OPTIONS = [
  { id: 25, label: '25' },
  { id: 50, label: '50' },
  { id: 100, label: '100' },
];

export const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute z-50 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white ${
          position === 'bottom' ? 'top-full left-1/2 mt-1 -translate-x-1/2' : 'bottom-full left-1/2 mb-1 -translate-x-1/2'
        }`}>
          {text}
        </div>
      )}
    </div>
  );
};

export const SearchSelect = ({ value, onChange, options, getLabel, placeholder = '', disabled = false, bordered = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const selected = options.find((option) => String(option.id) === String(value));
  const selectedLabel = selected ? getLabel(selected) : '';
  const filteredOptions = options
    .filter((option) => getLabel(option).toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 60);

  useEffect(() => {
    setInputValue(selectedLabel || '');
  }, [selectedLabel]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 9999,
      maxHeight: '220px',
      overflowY: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const el = dropdownRef.current.children[highlightedIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  const handleInputChange = (event) => {
    if (disabled) return;
    setInputValue(event.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (value) onChange('', null);
  };

  const handleSelectOption = (option) => {
    if (disabled) return;
    const label = getLabel(option);
    setInputValue(label);
    setIsOpen(false);
    setHighlightedIndex(0);
    onChange(option.id, option);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((previous) => Math.min(previous + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Tab' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (disabled) return;
          setIsOpen(true);
          updateDropdownPosition();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-[26px] w-full ${bordered ? 'border border-gray-300 bg-white' : 'border-0 bg-transparent'} px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
        autoComplete="off"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="border border-gray-300 bg-white shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-2 py-1 text-left text-xs ${
                index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'
              } ${String(option.id) === String(value) ? 'bg-blue-50' : ''}`}
            >
              {getLabel(option)}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export const StatusSwitch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative h-5 w-10 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
  </button>
);

export const Field = ({ label, children, required = false }) => (
  <div className="flex items-center" style={{ minHeight: 26 }}>
    <label className="min-w-[165px] text-xs font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="ml-2 flex-1">{children}</div>
  </div>
);

export const HeaderIconButton = ({ children, tooltip, onClick, className = '', disabled = false }) => (
  <Tooltip text={tooltip}>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  </Tooltip>
);
