import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import JuiceLoadingAnimation from "../components/JuiceLoadingAnimation";
import { getApiUrl } from "../config/env";
import { useAuth } from "../hooks/useAuth";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [use2FA, setUse2FA] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  // ページ読み込み時に前のページからのエラーメッセージを表示
  React.useEffect(() => {
    const state = location.state as { error?: string };
    if (state?.error) {
      setError(state.error);
    }
  }, [location.state]);

  // 認証済みユーザーを自動的にホームページにリダイレクト
  React.useEffect(() => {
    if (auth.isAuthenticated && !auth.loading) {
      console.log("認証済みユーザーをホームページにリダイレクト");
      navigate("/", { replace: true });
    }
  }, [auth.isAuthenticated, auth.loading, navigate]);

  // 認証状態確認中はローディング画面を表示
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <JuiceLoadingAnimation message="認証状態を確認中..." />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (use2FA) {
        // 2段階認証付きログイン
        const loginResponse = await fetch(`${getApiUrl()}/api/login-2fa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.error || "ログインに失敗しました");
        }

        // パスワード認証が成功した場合、OTPを送信
        const otpResponse = await fetch(`${getApiUrl()}/api/otp/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            purpose: "login",
          }),
        });

        const otpData = await otpResponse.json();

        if (!otpResponse.ok) {
          throw new Error(otpData.error || "認証コードの送信に失敗しました");
        }

        // 2FA画面に遷移
        navigate("/two-factor-auth", {
          state: { email },
        });
      } else {
        // 従来のログイン処理（2FAなし）
        const loginResponse = await fetch(`${getApiUrl()}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.error || "ログインに失敗しました");
        }

        // 従来のログイン成功処理
        if (loginData.token && loginData.user) {
          localStorage.setItem("token", loginData.token);
          localStorage.setItem("user", JSON.stringify(loginData.user));

          setIsSubmitting(false);
          setShowSuccessAnimation(true);
        } else {
          throw new Error("ログインレスポンスが不正です");
        }
      }
    } catch (err: any) {
      setError(err.message || "ログインに失敗しました。");
      setIsSubmitting(false);
    }
  };

  const handleAnimationComplete = () => {
    console.log("アニメーション完了、ホームページに遷移します");
    // 確実に認証状態を反映させるため、ページ全体をリロード
    window.location.href = "/";
  };

  // ログイン成功アニメーションを表示
  if (showSuccessAnimation) {
    return <JuiceLoadingAnimation onComplete={handleAnimationComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">J</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Juice Academy
          </h1>
          <p className="text-lg text-gray-600">
            美味しいドリンクライフを始めましょう
          </p>
        </div>

        <Card variant="modern" padding="large" className="shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              アカウントにログイン
            </h2>
            <p className="text-gray-600">
              ドリンクバーサービスをご利用ください
            </p>
          </div>

          {error && (
            <div className="alert alert-danger mb-6">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="form-label" htmlFor="email-address">
                メールアドレス
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="example@juiceacademy.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="password">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <input
                id="use-2fa"
                name="use-2fa"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                checked={use2FA}
                onChange={(e) => setUse2FA(e.target.checked)}
              />
              <label
                htmlFor="use-2fa"
                className="ml-2 block text-sm text-gray-900"
              >
                二段階認証を使用する
                <span className="text-gray-500 text-xs block">
                  （メールでワンタイムパスコードを受信）
                </span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
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
                  "ログイン"
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">または</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない方は
                <Link
                  to="/register"
                  className="ml-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  新規登録
                </Link>
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            ログインすることで、
            <a href="#" className="text-orange-600 hover:text-orange-700 mx-1">
              利用規約
            </a>
            と
            <a href="#" className="text-orange-600 hover:text-orange-700 mx-1">
              プライバシーポリシー
            </a>
            に同意したことになります。
          </p>
          <p className="text-xs text-gray-400 mt-2">
            &copy; {new Date().getFullYear()} Juice Academy. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
