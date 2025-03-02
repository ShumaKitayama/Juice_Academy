import React, { ReactNode, CSSProperties } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, style }) => {
  return (
    <div 
      className={`bg-white p-6 rounded-lg shadow-md ${className}`}
      style={style}
    >
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card; 