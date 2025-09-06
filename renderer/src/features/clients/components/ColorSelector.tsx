import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CLIENT_COLORS, type ClientColor } from '../types';

interface ColorSelectorProps {
  value?: ClientColor | null;
  onChange: (color: ClientColor | null) => void;
  placeholder?: string;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Seleccionar color (opcional)" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedColor = value ? CLIENT_COLORS.find(color => color.value === value) : null;

  // Cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorSelect = (color: ClientColor | null) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedColor ? (
              <>
                <div className={`w-4 h-4 rounded-full ${selectedColor.bg}`} />
                <span className="text-sm text-gray-700">{selectedColor.name}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="py-1">
            {/* Opción para ningún color */}
            <button
              type="button"
              onClick={() => handleColorSelect(null)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-transparent" />
                <span>Sin color</span>
              </div>
            </button>
            
            {/* Opciones de colores */}
            {CLIENT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorSelect(color.value)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${color.bg}`} />
                  <span>{color.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorSelector;
