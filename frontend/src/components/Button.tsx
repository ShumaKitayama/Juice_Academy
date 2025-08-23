import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "success"
    | "ghost";
  size?: "small" | "medium" | "large";
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = "left",
  className = "",
  disabled,
  ...props
}) => {
  // バリアントに基づくスタイル
  const getVariantStyles = () => {
    const baseStyles =
      "font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-opacity-50";

    switch (variant) {
      case "primary":
        return `${baseStyles} btn-primary focus:ring-orange-200`;
      case "secondary":
        return `${baseStyles} btn-secondary focus:ring-orange-200`;
      case "outline":
        return `${baseStyles} btn-outline focus:ring-gray-200`;
      case "danger":
        return `${baseStyles} bg-red-500 hover:bg-red-600 text-white border-transparent hover:shadow-lg hover:-translate-y-0.5 focus:ring-red-200`;
      case "success":
        return `${baseStyles} bg-green-500 hover:bg-green-600 text-white border-transparent hover:shadow-lg hover:-translate-y-0.5 focus:ring-green-200`;
      case "ghost":
        return `${baseStyles} bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 border-transparent`;
      default:
        return `${baseStyles} btn-primary focus:ring-orange-200`;
    }
  };

  // サイズに基づくスタイル
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "px-4 py-2 text-sm rounded-lg";
      case "medium":
        return "px-6 py-3 text-base rounded-xl";
      case "large":
        return "px-8 py-4 text-lg rounded-2xl";
      default:
        return "px-6 py-3 text-base rounded-xl";
    }
  };

  // 無効状態とローディング状態のスタイル
  const getStateStyles = () => {
    if (disabled && !isLoading) {
      return "opacity-60 cursor-not-allowed transform-none hover:transform-none";
    }
    if (isLoading) {
      return "opacity-80 cursor-wait";
    }
    return "";
  };

  // 幅のスタイル
  const widthStyle = fullWidth ? "w-full" : "";

  // アイコンのサイズ
  const getIconSize = () => {
    switch (size) {
      case "small":
        return "w-4 h-4";
      case "medium":
        return "w-5 h-5";
      case "large":
        return "w-6 h-6";
      default:
        return "w-5 h-5";
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <svg
            className={`animate-spin ${getIconSize()} ${
              children ? "mr-2" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {children && <span>処理中...</span>}
        </>
      );
    }

    return (
      <>
        {icon && iconPosition === "left" && (
          <span className={`${getIconSize()} ${children ? "mr-2" : ""}`}>
            {icon}
          </span>
        )}
        {children}
        {icon && iconPosition === "right" && (
          <span className={`${getIconSize()} ${children ? "ml-2" : ""}`}>
            {icon}
          </span>
        )}
      </>
    );
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${getStateStyles()}
        ${widthStyle}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
