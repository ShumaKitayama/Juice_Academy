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
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  React.useEffect(() => {
    const state = location.state as { error?: string };
    if (state?.error) {
      setError(state.error);
    }
  }, [location.state]);

  React.useEffect(() => {
    if (auth.isAuthenticated && !auth.loading) {
      navigate("/", { replace: true });
    }
  }, [auth.isAuthenticated, auth.loading, navigate]);

  if (auth.loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <JuiceLoadingAnimation />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginResponse = await fetch(`${getApiUrl()}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.error || "ログインに失敗しました");
      }

      const otpResponse = await fetch(`${getApiUrl()}/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          purpose: "login",
        }),
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        throw new Error(otpData.error || "認証コードの送信に失敗しました");
      }

      setIsSubmitting(false);
      navigate("/two-factor-auth", {
        state: { email },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "ログインに失敗しました。");
      } else {
        setError("ログインに失敗しました。");
      }
      setIsSubmitting(false);
    }
  };

  const focusStyles =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2";

  return (
    <div className="min-h-dvh bg-gray-50 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="size-14 sm:size-16 bg-juice-orange-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-juice-orange-100">
              <span className="text-white font-bold text-2xl sm:text-3xl">
                J
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 tracking-tight">
            Juice Academy
          </h1>
          <p className="text-sm sm:text-base text-gray-500 text-pretty">
            美味しいドリンクライフを始めましょう
          </p>
        </div>

        <Card variant="modern" padding="large" className="shadow-lg">
          <div className="text-center mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 tracking-tight">
              アカウントにログイン
            </h2>
            <p className="text-sm text-gray-500 text-pretty">
              ドリンクバーサービスをご利用ください
            </p>
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 shadow-sm"
              role="alert"
            >
              <div className="flex items-center">
                <svg
                  className="size-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                className={`form-input ${focusStyles}`}
                placeholder="example@juiceacademy.jp…"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                spellCheck={false}
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
                className={`form-input ${focusStyles}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn-primary w-full ${focusStyles}`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    処理中…
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
                <div className="w-full border-t border-gray-200" />
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
                  className={`ml-1 font-semibold text-juice-orange-600 hover:text-juice-orange-700 transition-colors duration-150 rounded ${focusStyles}`}
                >
                  新規登録
                </Link>
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-6 sm:mt-8 text-center px-2">
          <p className="text-xs text-gray-500 leading-relaxed text-pretty">
            ログインすることで、
            <a
              href="#"
              className={`text-juice-orange-600 hover:text-juice-orange-700 rounded ${focusStyles}`}
            >
              利用規約
            </a>
            と
            <a
              href="#"
              className={`text-juice-orange-600 hover:text-juice-orange-700 rounded ${focusStyles}`}
            >
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
