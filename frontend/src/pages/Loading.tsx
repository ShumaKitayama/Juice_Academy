import React from "react";
import JuiceLoadingAnimation from "../components/JuiceLoadingAnimation";

interface LoadingProps {
  onComplete?: () => void;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ onComplete }) => {
  return <JuiceLoadingAnimation onComplete={onComplete} />;
};

export default Loading;
