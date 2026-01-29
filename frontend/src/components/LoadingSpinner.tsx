import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  message = "ロード中…",
}) => {
  const sizeClasses = {
    small: "size-6 border-2",
    medium: "size-10 border-3",
    large: "size-16 border-4",
  };

  return (
    <div
      className="flex flex-col items-center justify-center p-4"
      role="status"
      aria-live="polite"
    >
      <div className={`spinner ${sizeClasses[size]}`} aria-hidden="true" />
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default LoadingSpinner;
