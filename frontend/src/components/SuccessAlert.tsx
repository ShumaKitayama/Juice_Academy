import React from "react";

export interface SuccessAlertProps {
  message: string;
  title?: string;
  className?: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  title,
  className = "",
}) => {
  return (
    <div
      className={`bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 ${className}`}
      role="alert"
    >
      {title && <p className="font-bold mb-1">{title}</p>}
      <span className="block sm:inline text-pretty">{message}</span>
    </div>
  );
};

export default SuccessAlert;
