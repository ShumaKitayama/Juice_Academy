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
        return "card-modern";
      case "featured":
        return "card-featured";
      case "simple":
        return "card-simple";
      case "elevated":
        return "bg-white rounded-2xl shadow-xl border-0 overflow-hidden";
      default:
        return `bg-white rounded-xl shadow-sm ${
          border ? "border border-gray-200" : "border-0"
        } overflow-hidden`;
    }
  };

  // パディングスタイル
  const getPaddingStyles = () => {
    switch (padding) {
      case "none":
        return "";
      case "small":
        return "p-4";
      case "medium":
        return "p-6";
      case "large":
        return "p-8";
      default:
        return "p-6";
    }
  };

  // ホバーエフェクト
  const getHoverStyles = () => {
    if (!hover) return "";
    return "transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1";
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
        <div className={`${title && subtitle ? "mb-6" : "mb-4"}`}>
          {title && (
            <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-gray-600 leading-relaxed">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
