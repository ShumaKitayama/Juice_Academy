import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import JuiceLoadingAnimation from "../components/JuiceLoadingAnimation";
import { useAuth } from "../hooks/useAuth";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      setShowSuccessAnimation(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "ログインに失敗しました。");
      setIsSubmitting(false);
    }
  };

  const handleAnimationComplete = () => {
    navigate("/");
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
