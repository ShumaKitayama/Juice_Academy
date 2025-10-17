import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import OTPInput from "../components/OTPInput";
import SuccessAlert from "../components/SuccessAlert";
import { getApiUrl } from "../config/env";
import { useAuth } from "../hooks/useAuth";

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const TwoFactorAuth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false); // 重複送信防止

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  // 認証済みユーザーを自動的にホームページにリダイレクト
  useEffect(() => {
    if (auth.isAuthenticated && !auth.loading) {
      console.log("認証済みユーザーをホームページにリダイレクト");
      navigate("/", { replace: true });
      return;
    }
  }, [auth.isAuthenticated, auth.loading, navigate]);

  // ログイン画面から渡されたメールアドレスを取得
  useEffect(() => {
    // 認証済みの場合はスキップ
    if (auth.isAuthenticated) return;

    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
    } else {
      // メールアドレスがない場合はログイン画面に戻る
      navigate("/login", {
        state: {
          error: "認証セッションが無効です。再度ログインしてください。",
        },
      });
    }
  }, [location.state, navigate, auth.isAuthenticated]);

  const handleOTPComplete = async (otp: string) => {
    if (!email) {
      setError("メールアドレスが設定されていません");
      return;
    }

    // 既に送信中の場合は処理を中断
    if (isSubmitting) {
      console.log("OTP認証リクエストは既に送信中です");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiUrl()}/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
          purpose: "login",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "認証に失敗しました");
      }

      // 認証成功時の処理
      if (data.token && data.user) {
        // トークンとユーザー情報を保存
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // AuthContextに認証状態の変更を通知
        window.dispatchEvent(new Event("auth-changed"));

        setSuccess("認証が完了しました。ダッシュボードに移動します...");

        // 即座にダッシュボードに遷移
        navigate("/", { replace: true });
      } else {
        throw new Error("認証レスポンスが不正です");
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(
        apiError.response?.data?.error ||
          (error as Error).message ||
          "認証に失敗しました"
      );
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      setError("メールアドレスが設定されていません");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiUrl()}/otp/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          purpose: "login",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "再送信に失敗しました");
      }

      setSuccess("認証コードを再送信しました");
    } catch (error) {
      const apiError = error as ApiError;
      setError(
        apiError.response?.data?.error ||
          (error as Error).message ||
          "再送信に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-juice-orange-50 to-juice-yellow-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-juice-orange-500 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Juice Academy
          </h1>
          <p className="text-gray-600">
            セキュリティのため、二段階認証を完了してください
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {email} にワンタイムパスコードを送信しました
          </p>

          {/* 開発環境での注意書き */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-blue-800 text-xs font-medium mb-1">
                🔧 開発モード
              </p>
              <p className="text-blue-600 text-xs">
                OTPコードはバックエンドのログで確認できます：
                <br />
                <code className="bg-blue-100 px-1 rounded">
                  docker-compose logs backend | tail -20
                </code>
              </p>
            </div>
          )}
        </div>

        <Card variant="elevated" className="mt-8">
          {success && <SuccessAlert message={success} className="mb-6" />}

          {error && <ErrorAlert message={error} className="mb-6" />}

          <OTPInput
            onComplete={handleOTPComplete}
            onResend={handleResendOTP}
            loading={loading}
            error={error || undefined}
            email={email}
            expiryTime={300} // 5分
          />

          <div className="mt-8 flex flex-col space-y-3">
            <Button
              onClick={handleBackToLogin}
              variant="outline"
              fullWidth
              disabled={loading}
            >
              ログイン画面に戻る
            </Button>
          </div>
        </Card>

        {/* セキュリティ情報 */}
        <div className="mt-6 text-center">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-gray-800">
                セキュア認証
              </span>
            </div>
            <p className="text-xs text-gray-600">
              あなたのアカウントは二段階認証で保護されています。
              <br />
              認証コードは暗号化されて送信され、5分間のみ有効です。
            </p>
          </div>
        </div>

        {/* ヘルプリンク */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            メールが届かない場合や問題がある場合は、
            <br />
            <a
              href="mailto:support@juiceacademy.jp"
              className="text-juice-orange-500 hover:text-juice-orange-600 font-medium"
            >
              サポートチーム
            </a>
            までお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
