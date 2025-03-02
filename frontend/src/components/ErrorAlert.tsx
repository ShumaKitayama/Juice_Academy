import React from 'react';

export interface ErrorAlertProps {
  message: string;
  title?: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, title = 'エラー', className = '' }) => {
  return (
    <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 alert ${className}`} role="alert">
      {title && <p className="font-bold">{title}</p>}
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

export default ErrorAlert; 