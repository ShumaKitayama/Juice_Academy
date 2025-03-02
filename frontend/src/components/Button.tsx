import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  // バリアントに基づくスタイル
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
    outline: 'bg-white hover:bg-gray-50 text-blue-600 border-blue-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  };

  // サイズに基づくスタイル
  const sizeStyles = {
    small: 'py-1 px-3 text-sm',
    medium: 'py-2 px-4 text-base',
    large: 'py-3 px-6 text-lg',
  };

  // 無効状態のスタイル
  const disabledStyle = disabled || isLoading
    ? 'opacity-50 cursor-not-allowed'
    : 'hover:shadow-md active:shadow-inner';

  // 幅のスタイル
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md
        border transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyle}
        ${widthStyle}
        ${className}
        transform hover:-translate-y-0.5 active:translate-y-0
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
          処理中...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button; 