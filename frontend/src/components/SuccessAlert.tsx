import React from 'react';

export interface SuccessAlertProps {
  message: string;
  title?: string;
  className?: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, title, className = '' }) => {
  return (
    <div className={`bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 alert ${className}`} role="alert">
      {title && <p className="font-bold">{title}</p>}
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

export default SuccessAlert; 