import React, { useEffect, useRef, useState } from "react";
import Button from "./Button";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend?: () => void;
  loading?: boolean;
  error?: string;
  email?: string;
  expiryTime?: number; // 秒単位
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onResend,
  loading = false,
  error,
  email,
  expiryTime = 300, // デフォルト5分
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(expiryTime);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // タイマー機能
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // 入力フォーカス管理
  useEffect(() => {
    if (inputRefs.current[activeIndex]) {
      inputRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  // OTP完了チェック（useCallbackで最適化）
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const otpString = otp.join("");
    if (
      otpString.length === length &&
      otp.every((digit) => digit !== "") &&
      !hasCompleted
    ) {
      setHasCompleted(true);
      onComplete(otpString);
    }
    // OTPが不完全になった場合はリセット
    if (otpString.length < length) {
      setHasCompleted(false);
    }
  }, [otp, length, onComplete, hasCompleted]);

  const handleInputChange = (index: number, value: string) => {
    // 数字のみ許可
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    // 複数文字が貼り付けられた場合の処理
    if (value.length > 1) {
      const pastedValue = value.slice(0, length);
      for (let i = 0; i < pastedValue.length && i + index < length; i++) {
        newOtp[index + i] = pastedValue[i];
      }
      setOtp(newOtp);

      // 次のフォーカス位置を計算
      const nextIndex = Math.min(index + pastedValue.length, length - 1);
      setActiveIndex(nextIndex);
    } else {
      // 単一文字の入力
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < length - 1) {
        setActiveIndex(index + 1);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // 現在の位置に文字がある場合は削除
        newOtp[index] = "";
      } else if (index > 0) {
        // 現在の位置が空で、前の位置に移動
        newOtp[index - 1] = "";
        setActiveIndex(index - 1);
      }
      setOtp(newOtp);
    } else if (e.key === "ArrowLeft" && index > 0) {
      setActiveIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      setActiveIndex(index + 1);
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < Math.min(pastedData.length, length); i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      const nextIndex = Math.min(pastedData.length, length - 1);
      setActiveIndex(nextIndex);
    }
  };

  const clearOtp = () => {
    setOtp(new Array(length).fill(""));
    setActiveIndex(0);
  };

  const handleResend = () => {
    if (onResend && canResend) {
      onResend();
      setTimeLeft(expiryTime);
      setCanResend(false);
      clearOtp();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          認証コードを入力
        </h2>
        {email && (
          <p className="text-gray-600 text-sm">
            <span className="font-medium">{email}</span>{" "}
            に送信された6桁のコードを入力してください
          </p>
        )}
      </div>

      {/* OTP入力フィールド */}
      <div className="flex justify-center space-x-2 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onPaste={handlePaste}
            disabled={loading}
            className={`
              w-12 h-12 text-center text-xl font-bold border-2 rounded-lg
              transition-all duration-200 ease-in-out
              ${
                activeIndex === index
                  ? "border-juice-orange-500 ring-2 ring-juice-orange-200"
                  : "border-gray-300 hover:border-gray-400"
              }
              ${digit ? "bg-juice-orange-50" : "bg-white"}
              ${loading ? "opacity-50 cursor-not-allowed" : "cursor-text"}
              ${error ? "border-red-500" : ""}
              focus:outline-none focus:border-juice-orange-500 focus:ring-2 focus:ring-juice-orange-200
            `}
          />
        ))}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* タイマーと再送信 */}
      <div className="text-center">
        {timeLeft > 0 ? (
          <div className="text-gray-600 text-sm mb-4">
            <div className="flex items-center justify-center mb-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              残り時間:{" "}
              <span className="font-mono font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              コードの有効期限が切れる前に入力してください
            </p>
          </div>
        ) : (
          <div className="text-red-600 text-sm mb-4">
            <div className="flex items-center justify-center mb-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              認証コードの有効期限が切れました
            </div>
            <p className="text-xs">新しい認証コードを取得してください</p>
          </div>
        )}

        {/* 再送信ボタン */}
        {onResend && (
          <div className="space-y-2">
            <Button
              onClick={handleResend}
              disabled={!canResend || loading}
              variant="outline"
              size="small"
              isLoading={loading}
            >
              {canResend
                ? "認証コードを再送信"
                : `再送信まで ${formatTime(timeLeft)}`}
            </Button>

            {canResend && (
              <p className="text-xs text-gray-500">
                メールが届かない場合は再送信してください
              </p>
            )}
          </div>
        )}

        {/* クリアボタン */}
        <button
          onClick={clearOtp}
          disabled={loading}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          入力をクリア
        </button>
      </div>

      {/* 説明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">認証コードについて</p>
            <ul className="text-xs space-y-1">
              <li>• メールで送信された6桁の数字を入力してください</li>
              <li>• コードは5分間有効です</li>
              <li>• コードは一度のみ使用可能です</li>
              <li>
                • メールが届かない場合は迷惑メールフォルダもご確認ください
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPInput;
