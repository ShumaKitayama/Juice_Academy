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
      "font-semibold transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

    switch (variant) {
      case "primary":
        return `${baseStyles} bg-juice-orange-500 hover:bg-juice-orange-600 text-white focus-visible:ring-juice-orange-500`;
      case "secondary":
        return `${baseStyles} bg-white border-[1.5px] border-juice-orange-500 text-juice-orange-500 hover:bg-juice-orange-500 hover:text-white focus-visible:ring-juice-orange-500`;
      case "outline":
        return `${baseStyles} bg-transparent border-[1.5px] border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 focus-visible:ring-gray-400 shadow-none hover:shadow-sm`;
      case "danger":
        return `${baseStyles} bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500`;
      case "success":
        return `${baseStyles} bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500`;
      case "ghost":
        return `${baseStyles} bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 focus-visible:ring-gray-400 shadow-none hover:shadow-none`;
      default:
        return `${baseStyles} bg-juice-orange-500 hover:bg-juice-orange-600 text-white focus-visible:ring-juice-orange-500`;
    }
  };

  // サイズに基づくスタイル
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "px-4 py-2 text-sm rounded-lg";
      case "medium":
        return "px-6 py-3 text-base rounded-lg";
      case "large":
        return "px-8 py-4 text-lg rounded-xl";
      default:
        return "px-6 py-3 text-base rounded-lg";
    }
  };

  // 無効状態とローディング状態のスタイル
  const getStateStyles = () => {
    if (disabled && !isLoading) {
      return "opacity-50 cursor-not-allowed grayscale-[0.3] hover:translate-y-0 hover:shadow-sm active:scale-100";
    }
    if (isLoading) {
      return "opacity-70 cursor-wait hover:translate-y-0 hover:shadow-sm active:scale-100";
    }
    return "";
  };

  // 幅のスタイル
  const widthStyle = fullWidth ? "w-full" : "";

  // アイコンのサイズ
  const getIconSize = () => {
    switch (size) {
      case "small":
        return "size-4";
      case "medium":
        return "size-5";
      case "large":
        return "size-6";
      default:
        return "size-5";
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
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children && <span>処理中…</span>}
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
      `.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
