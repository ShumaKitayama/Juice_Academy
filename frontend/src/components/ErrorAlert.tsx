import React from "react";

export interface ErrorAlertProps {
  message: string;
  title?: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = "エラー",
  className = "",
}) => {
  return (
    <div
      className={`bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 ${className}`}
      role="alert"
    >
      {title && <p className="font-bold mb-1">{title}</p>}
      <span className="block sm:inline text-pretty">{message}</span>
    </div>
  );
};

export default ErrorAlert;
