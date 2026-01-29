import React, { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  style?: CSSProperties;
  variant?: "default" | "modern" | "featured" | "simple" | "elevated";
  padding?: "none" | "small" | "medium" | "large";
  hover?: boolean;
  border?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  subtitle,
  style,
  variant = "default",
  padding = "medium",
  hover = true,
  border = true,
}) => {
  // バリアントに基づくスタイル
  const getVariantStyles = () => {
    switch (variant) {
      case "modern":
        return "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden";
      case "featured":
        return "bg-juice-orange-50 rounded-xl border-[1.5px] border-juice-orange-300 overflow-hidden relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-juice-orange-500 shadow-sm";
      case "simple":
        return "bg-white rounded-lg shadow-sm border border-gray-200";
      case "elevated":
        return "bg-white rounded-xl shadow-md border-0 overflow-hidden";
      default:
        return `bg-white rounded-xl shadow-sm ${
          border ? "border border-gray-200" : "border-0"
        } overflow-hidden`;
    }
  };

  // パディングスタイル（レスポンシブ対応）
  const getPaddingStyles = () => {
    switch (padding) {
      case "none":
        return "";
      case "small":
        return "p-3 sm:p-4";
      case "medium":
        return "p-4 sm:p-6";
      case "large":
        return "p-4 sm:p-6 lg:p-8";
      default:
        return "p-4 sm:p-6";
    }
  };

  // ホバーエフェクト（shadow + translateY for depth）
  const getHoverStyles = () => {
    if (!hover) return "";
    return "transition-all duration-200 ease-smooth hover:shadow-lg hover:-translate-y-0.5";
  };

  const cardClasses = `
    ${getVariantStyles()}
    ${getPaddingStyles()}
    ${getHoverStyles()}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} style={style}>
      {(title || subtitle) && (
        <div className={`${title && subtitle ? "mb-4" : "mb-3"}`}>
          {title && (
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2 leading-tight text-balance tracking-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed text-pretty tracking-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
