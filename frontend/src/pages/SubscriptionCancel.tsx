import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate("/subscription");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto size-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="size-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 text-balance">
            サブスクリプション登録がキャンセルされました
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4 text-pretty">
            サブスクリプションの登録手続きはキャンセルされました。
          </p>
        </div>

        <ErrorAlert message="サブスクリプションの登録手続きはキャンセルされました。いつでも再度お試しいただけます。" />

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={handleGoBack} variant="primary" size="medium">
            サブスクリプションに戻る
          </Button>
          <Button onClick={handleGoHome} variant="outline" size="medium">
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
