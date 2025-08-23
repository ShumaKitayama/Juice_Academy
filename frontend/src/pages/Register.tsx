import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";
import { useAuth } from "../hooks/useAuth";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    role: "student", // デフォルトは学生
    student_id: "",
    name_kana: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name_kana?: string;
    password?: string;
  }>({});

  const { register } = useAuth();
  const navigate = useNavigate();

  // 氏名（カナ）のバリデーション
  const validateNameKana = (nameKana: string): boolean => {
    const katakanaPattern = /^[ァ-ヶー\s\u3000]+$/;
    return katakanaPattern.test(nameKana);
  };

  // パスワードのバリデーション
  const validatePassword = (password: string): boolean => {
    if (password.length < 8) return false;

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);

    return hasUpper && hasLower && hasDigit;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // リアルタイムバリデーション
    const newValidationErrors = { ...validationErrors };

    if (name === "name_kana") {
      if (value && !validateNameKana(value)) {
        newValidationErrors.name_kana = "カタカナのみで入力してください";
      } else {
        delete newValidationErrors.name_kana;
      }
    }

    if (name === "password") {
      if (value && !validatePassword(value)) {
        newValidationErrors.password =
          "8文字以上で、英字の大文字・小文字・数字をすべて含む必要があります";
      } else {
        delete newValidationErrors.password;
      }
    }

    setValidationErrors(newValidationErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーションチェック
    if (!validateNameKana(formData.name_kana)) {
      setError("氏名（カナ）はカタカナのみで入力してください");
      return;
    }

    if (!validatePassword(formData.password)) {
      setError(
        "パスワードは8文字以上で、英字の大文字・小文字・数字をすべて含む必要があります"
      );
      return;
    }

    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsSubmitting(true);

    try {
      // confirmPasswordを除いたデータを送信
      const { ...registerData } = formData;
      await register(registerData);
      setSuccess(true);

      // 登録成功後、3秒後にログインページへリダイレクト
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || "登録に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-juice-orange-400 to-juice-orange-600">
              Juice Academy
            </h1>
            <p className="mt-3 text-gray-600">
              学校にドリンクバーを設置するためのサービス
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="p-8 text-center">
              <SuccessAlert message="アカウントが正常に作成されました。ログインページに移動します。" />
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-juice-orange-500 hover:bg-juice-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-400"
                >
                  ログインページへ
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-juice-orange-400 to-juice-orange-600">
            Juice Academy
          </h1>
          <p className="mt-3 text-gray-600">
            学校にドリンクバーを設置するためのサービス
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              新規アカウント登録
            </h2>

            {error && <ErrorAlert message={error} className="mb-6" />}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ユーザータイプ
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="student">学生</option>
                  <option value="teacher">教師</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="student_id"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  学籍番号
                </label>
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  placeholder="例: 12345678"
                  value={formData.student_id}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="name_kana"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  氏名（カナ）
                </label>
                <input
                  id="name_kana"
                  name="name_kana"
                  type="text"
                  required
                  className={`appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${
                    validationErrors.name_kana
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-juice-orange-500 focus:border-juice-orange-500"
                  }`}
                  placeholder="例: ヤマダ タロウ"
                  value={formData.name_kana}
                  onChange={handleChange}
                />
                {validationErrors.name_kana && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors.name_kana}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  カタカナのみで入力してください
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  placeholder="example@juiceacademy.jp"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${
                    validationErrors.password
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-juice-orange-500 focus:border-juice-orange-500"
                  }`}
                  placeholder="8文字以上の英数字"
                  value={formData.password}
                  onChange={handleChange}
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  8文字以上で、英字の大文字・小文字・数字をすべて含めてください
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  パスワード（確認）
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  placeholder="パスワードを再入力"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting
                      ? "bg-juice-orange-400"
                      : "bg-juice-orange-500 hover:bg-juice-orange-600"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-500 transition-colors duration-200`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
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
                    </span>
                  ) : (
                    "登録する"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">または</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  既にアカウントをお持ちの方は
                  <Link
                    to="/login"
                    className="ml-1 font-medium text-juice-orange-600 hover:text-juice-orange-500"
                  >
                    ログイン
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
            登録することで、利用規約とプライバシーポリシーに同意したことになります。
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Juice Academy. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
