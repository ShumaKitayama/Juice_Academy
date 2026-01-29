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

  const getRoleText = () => {
    if (user.role === "student") return "学生";
    if (user.role === "teacher") return "教職員";
    if (user.role === "admin") return "管理者";
    return user.role;
  };

  return (
    <div className="text-left">
      <h2 className="text-xl font-bold text-gray-800 mb-4">プロフィール</h2>

      {/* 情報リスト */}
      <div className="divide-y divide-gray-100">
        <div className="py-3 flex justify-between items-center">
          <span className="text-base text-gray-500">名前</span>
          <span className="text-lg font-medium text-gray-900">
            {user.nameKana || "未設定"}
          </span>
        </div>
        <div className="py-3 flex justify-between items-center">
          <span className="text-base text-gray-500">学籍番号</span>
          <span className="text-lg font-medium text-gray-900">
            {user.studentId || "未設定"}
          </span>
        </div>
        <div className="py-3 flex justify-between items-center">
          <span className="text-base text-gray-500">タイプ</span>
          <span className="text-lg font-medium text-gray-900 flex items-center gap-2">
            {getRoleText()}
            {user.isAdmin && (
              <span className="px-2 py-0.5 text-sm bg-orange-100 text-orange-700 rounded">
                管理者
              </span>
            )}
          </span>
        </div>
        <div className="py-3 flex justify-between items-start">
          <span className="text-base text-gray-500 pt-0.5">メール</span>
          <span className="text-lg font-medium text-gray-900 text-right break-all max-w-[70%]">
            {user.email}
          </span>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          className="px-6 py-3 text-base font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={() => alert("プロフィール編集機能は準備中です")}
        >
          編集
        </button>
      </div>
    </div>
  );
};

export default Profile;
