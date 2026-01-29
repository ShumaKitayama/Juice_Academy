import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import SuccessAlert from "../components/SuccessAlert";

const SubscriptionSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-lg text-gray-600">
            サブスクリプション情報を確認中…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto size-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="size-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl text-balance">
            サブスクリプション登録完了
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4 text-pretty">
            ありがとうございます！
          </p>
        </div>

        <SuccessAlert
          title="登録完了"
          message="サブスクリプションが正常に登録されました。ダッシュボードからコンテンツにアクセスできます。"
        />

        <div className="mt-8 text-center">
          <Button
            onClick={handleGoToDashboard}
            variant="primary"
            size="large"
            className="px-8"
          >
            ダッシュボードへ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
