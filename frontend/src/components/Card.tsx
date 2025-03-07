import React, { ReactNode, CSSProperties } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  style?: CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, style }) => {
  return (
    <div 
      className={`bg-white p-6 rounded-lg shadow-md ${className}`}
      style={style}
    >
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
};

export default Card; 