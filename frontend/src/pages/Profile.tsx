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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">プロフィール</h2>
        <p className="text-gray-600">アカウント情報を確認できます</p>
      </div>

      <div className="card-modern p-8">
        {/* プロフィール画像とメイン情報 */}
        <div className="flex items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold mr-6">
            {user.nameKana?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">
              {user.nameKana || "ユーザー"}
            </h3>
            <p className="text-gray-600">{user.email}</p>
            {user.isAdmin && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-2">
                管理者
              </span>
            )}
          </div>
        </div>

        {/* 基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="form-label">学籍番号</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {user.studentId || "未設定"}
              </div>
            </div>

            <div>
              <label className="form-label">ユーザータイプ</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {user.role === "student"
                  ? "学生"
                  : user.role === "teacher"
                  ? "教師"
                  : user.role === "admin"
                  ? "管理者"
                  : user.role}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">メールアドレス</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {user.email}
              </div>
            </div>

            <div>
              <label className="form-label">アカウント作成日</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {new Date().toLocaleDateString("ja-JP")}
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <button
            className="btn-primary"
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
