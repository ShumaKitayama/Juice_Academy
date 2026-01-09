import React from "react";
import { useAuth } from "../hooks/useAuth";

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-gray-500">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 sm:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
          プロフィール
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          アカウント情報を確認できます
        </p>
      </div>

      <div className="card-modern p-4 sm:p-6 md:p-8">
        {/* プロフィール画像とメイン情報 */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-0 sm:mr-6">
            {user.nameKana?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1">
              {user.nameKana || "ユーザー"}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 break-all">
              {user.email}
            </p>
            {user.isAdmin && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-2">
                管理者
              </span>
            )}
          </div>
        </div>

        {/* 基本情報 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="form-label text-xs sm:text-sm">学籍番号</label>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border text-sm sm:text-base">
                {user.studentId || "未設定"}
              </div>
            </div>

            <div>
              <label className="form-label text-xs sm:text-sm">
                ユーザータイプ
              </label>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border text-sm sm:text-base">
                {user.role === "student"
                  ? "学生"
                  : user.role === "teacher"
                  ? "教職員"
                  : user.role === "admin"
                  ? "管理者"
                  : user.role}
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="form-label text-xs sm:text-sm">
                メールアドレス
              </label>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border text-sm sm:text-base break-all">
                {user.email}
              </div>
            </div>

            <div>
              <label className="form-label text-xs sm:text-sm">
                アカウント作成日
              </label>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border text-sm sm:text-base">
                {new Date().toLocaleDateString("ja-JP")}
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-center sm:justify-end mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
          <button
            className="btn-primary w-full sm:w-auto text-sm sm:text-base"
            onClick={() => alert("プロフィール編集機能は準備中です")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            プロフィール編集
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
