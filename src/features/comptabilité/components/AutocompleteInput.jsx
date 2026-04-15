import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiCheck } from 'react-icons/fi';

export default function AutocompleteInput({
  value,
  selectedId,
  onChange,
  onSelect,
  options = [],
  getOptionLabel,
  placeholder = "",
  className = "",
  disabled = false,
  required = false,
  icon: Icon,
  clearable = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // Synchroniser l'input avec la valeur externe
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Filtrer les options
  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    const search = inputValue.toLowerCase();
    return label.includes(search);
  });

  // Mettre à jour la position du dropdown
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '0.25rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      });
    }
  };

  // Gestionnaires d'événements pour le dropdown
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        
        // Si on a une valeur sélectionnée mais que l'input est vide, restaurer la valeur
        if (selectedId && !inputValue) {
          const selected = options.find(opt => opt.id === selectedId);
          if (selected) {
            setInputValue(getOptionLabel(selected));
          }
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedId, options, inputValue, getOptionLabel]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    if (onChange) {
      onChange(newValue);
    }
    
    // Si on avait une sélection, on la désélectionne
    if (selectedId && onSelect) {
      onSelect(null, '');
    }
  };

  const handleSelectOption = (option) => {
    const label = getOptionLabel(option);
    const id = option.id;
    
    setInputValue(label);
    setIsOpen(false);
    
    if (onSelect) {
      onSelect(id, label);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        
        // Restaurer la valeur sélectionnée si elle existe
        if (selectedId) {
          const selected = options.find(opt => opt.id === selectedId);
          if (selected) {
            setInputValue(getOptionLabel(selected));
          }
        }
      }
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (onSelect) {
      onSelect(null, '');
    }
    if (onChange) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  // Scroll automatique dans le dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  return (
    <div className="relative w-full">
      {/* Champ de saisie */}
      <div className="relative">
        {Icon && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon size={14} />
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsOpen(true);
            updateDropdownPosition();
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none ${
            Icon ? 'pl-7' : 'pl-2'
          } ${className}`}
          autoComplete="off"
        />
        
        {/* Bouton d'effacement */}
        {clearable && inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      {/* Dropdown des résultats */}
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 shadow-lg rounded"
          style={dropdownStyle}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = option.id === selectedId;
            
            return (
              <div
                key={option.id}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  index === highlightedIndex
                    ? 'bg-violet-100 text-violet-700'
                    : isSelected
                    ? 'bg-violet-50 text-violet-600'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span>{getOptionLabel(option)}</span>
                  {isSelected && <FiCheck size={12} className="text-violet-600" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message quand aucun résultat */}
      {isOpen && filteredOptions.length === 0 && inputValue && (
        <div
          className="bg-white border border-gray-300 shadow-lg rounded p-3 text-center text-sm text-gray-500"
          style={dropdownStyle}
        >
          Aucun résultat trouvé
        </div>
      )}
    </div>
  );
}