import React from 'react';
import { CLIENT_COLORS, type ClientColor } from '../types';

interface ClientColorIndicatorProps {
  color?: ClientColor | null;
  size?: 'sm' | 'md' | 'lg';
}

const ClientColorIndicator: React.FC<ClientColorIndicatorProps> = ({ 
  color, 
  size = 'md' 
}) => {
  // Si no hay color, no mostrar nada
  if (!color) {
    return null;
  }

  const colorConfig = CLIENT_COLORS.find(c => c.value === color);
  if (!colorConfig) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full ${colorConfig.bg} flex-shrink-0`}
      title={colorConfig.name}
    />
  );
};

export default ClientColorIndicator;
