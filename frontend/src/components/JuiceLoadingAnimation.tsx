import React from "react";

interface JuiceLoadingAnimationProps {
  onComplete?: () => void;
  duration?: number;
}

const JuiceLoadingAnimation: React.FC<JuiceLoadingAnimationProps> = ({
  onComplete,
  duration = 2500,
}) => {
  React.useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [onComplete, duration]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 overflow-hidden">
      {/* 背景の装飾的な円 */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
        <div
          className="absolute bottom-32 right-32 w-24 h-24 bg-orange-300 rounded-full opacity-30 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute top-1/2 left-10 w-16 h-16 bg-orange-400 rounded-full opacity-25 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* メインのグラスコンテナ */}
      <div className="relative z-10 flex flex-col items-center">
        {/* ジュース注ぎ口のアニメーション */}
        <div className="relative mb-8">
          <div className="juice-pour-container">
            <div className="juice-stream"></div>
          </div>
        </div>

        {/* グラスとジュース */}
        <div className="relative">
          {/* グラスの外枠 */}
          <svg
            width="200"
            height="280"
            viewBox="0 0 200 280"
            className="relative z-20"
          >
            {/* グラスの影 */}
            <defs>
              <linearGradient
                id="glassGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "rgba(255,255,255,0.8)" }}
                />
                <stop
                  offset="50%"
                  style={{ stopColor: "rgba(255,255,255,0.3)" }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "rgba(255,255,255,0.8)" }}
                />
              </linearGradient>
              <linearGradient
                id="juiceGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" style={{ stopColor: "#ff8a4c" }} />
                <stop offset="50%" style={{ stopColor: "#ff5a1f" }} />
                <stop offset="100%" style={{ stopColor: "#d03801" }} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* グラスの本体 */}
            <path
              d="M50 80 L50 250 Q50 260 60 260 L140 260 Q150 260 150 250 L150 80 Q150 70 140 70 L60 70 Q50 70 50 80 Z"
              fill="url(#glassGradient)"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
              className="glass-container"
            />

            {/* グラスのハイライト */}
            <path
              d="M60 75 L60 250 Q60 255 65 255 L70 255"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              className="glass-highlight"
            />
          </svg>

          {/* ジュースの液体 */}
          <div
            className="absolute bottom-0 left-0 w-full overflow-hidden"
            style={{ borderRadius: "0 0 10px 10px" }}
          >
            <div className="juice-liquid"></div>

            {/* 液体の表面波紋 */}
            <div className="juice-surface-waves"></div>

            {/* 泡エフェクト */}
            <div className="bubble bubble-1"></div>
            <div className="bubble bubble-2"></div>
            <div className="bubble bubble-3"></div>
            <div className="bubble bubble-4"></div>
          </div>
        </div>

        {/* ロード中テキスト */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-2 animate-pulse">
            Juice Academy
          </h2>
          <p className="text-orange-500 text-lg animate-fade-in-out">
            美味しい学習体験を準備中...
          </p>
        </div>
      </div>

      <style>
        {`
        .juice-pour-container {
          width: 20px;
          height: 60px;
          position: relative;
          overflow: hidden;
        }

        .juice-stream {
          width: 8px;
          height: 0;
          background: linear-gradient(to bottom, #ff8a4c, #ff5a1f);
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 0 0 4px 4px;
          animation: pour-stream 2.5s ease-in-out forwards;
          box-shadow: 0 0 10px rgba(255, 138, 76, 0.5);
        }

        @keyframes pour-stream {
          0% { height: 0; opacity: 0; }
          20% { height: 60px; opacity: 1; }
          80% { height: 60px; opacity: 1; }
          100% { height: 0; opacity: 0; }
        }

        .juice-liquid {
          width: 100px;
          height: 0;
          background: linear-gradient(45deg, #ff8a4c 0%, #ff5a1f 50%, #d03801 100%);
          position: relative;
          left: 50px;
          border-radius: 0 0 10px 10px;
          animation: fill-glass 2s ease-out 0.3s forwards;
          box-shadow: 
            inset -10px 0 20px rgba(255, 90, 31, 0.3),
            inset 10px 0 20px rgba(255, 138, 76, 0.3),
            0 0 20px rgba(255, 138, 76, 0.4);
        }

        @keyframes fill-glass {
          0% { 
            height: 0; 
            transform: scaleY(0);
            transform-origin: bottom;
          }
          30% { 
            height: 60px; 
            transform: scaleY(1.1);
          }
          50% { 
            height: 120px; 
            transform: scaleY(1.05);
          }
          70% { 
            height: 160px; 
            transform: scaleY(1.02);
          }
          100% { 
            height: 180px; 
            transform: scaleY(1);
          }
        }

        .juice-surface-waves {
          position: absolute;
          top: -5px;
          left: 50px;
          width: 100px;
          height: 10px;
          background: radial-gradient(ellipse at center, rgba(255, 138, 76, 0.8) 0%, transparent 70%);
          border-radius: 50px;
          animation: surface-ripple 1s ease-in-out infinite 2s;
        }

        @keyframes surface-ripple {
          0%, 100% { 
            transform: scaleX(1) scaleY(1);
            opacity: 0.8;
          }
          50% { 
            transform: scaleX(1.1) scaleY(0.8);
            opacity: 0.6;
          }
        }

        .bubble {
          position: absolute;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 100%);
          border-radius: 50%;
          animation: bubble-float 3s ease-in-out infinite;
        }

        .bubble-1 {
          width: 8px;
          height: 8px;
          left: 70px;
          bottom: 20px;
          animation-delay: 1.5s;
        }

        .bubble-2 {
          width: 12px;
          height: 12px;
          left: 90px;
          bottom: 30px;
          animation-delay: 2s;
        }

        .bubble-3 {
          width: 6px;
          height: 6px;
          left: 120px;
          bottom: 15px;
          animation-delay: 2.3s;
        }

        .bubble-4 {
          width: 10px;
          height: 10px;
          left: 110px;
          bottom: 40px;
          animation-delay: 2.7s;
        }

        @keyframes bubble-float {
          0% { 
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          20% {
            transform: translateY(-10px) scale(1);
            opacity: 0.8;
          }
          80% {
            transform: translateY(-60px) scale(1);
            opacity: 0.6;
          }
          100% { 
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes fade-in-out {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out infinite;
        }

        .glass-container {
          filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.1));
        }

        .glass-highlight {
          opacity: 0;
          animation: highlight-shine 3s ease-in-out infinite 1s;
        }

        @keyframes highlight-shine {
          0%, 90% { opacity: 0; }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }
        `}
      </style>
    </div>
  );
};

export default JuiceLoadingAnimation;
