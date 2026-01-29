import React from "react";
import { useAuth } from "../hooks/useAuth";

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64" role="status">
        <div className="text-center">
          <p className="text-gray-500">ユーザー情報を読み込み中…</p>
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
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-balance">
        プロフィール
      </h2>

      {/* 情報リスト */}
      <dl className="divide-y divide-gray-100">
        <div className="py-3 flex justify-between items-center">
          <dt className="text-base text-gray-500">名前</dt>
          <dd className="text-lg font-medium text-gray-900">
            {user.nameKana || "未設定"}
          </dd>
        </div>
        <div className="py-3 flex justify-between items-center">
          <dt className="text-base text-gray-500">学籍番号</dt>
          <dd className="text-lg font-medium text-gray-900 tabular-nums">
            {user.studentId || "未設定"}
          </dd>
        </div>
        <div className="py-3 flex justify-between items-center">
          <dt className="text-base text-gray-500">タイプ</dt>
          <dd className="text-lg font-medium text-gray-900 flex items-center gap-2">
            {getRoleText()}
            {user.isAdmin && (
              <span className="px-2 py-0.5 text-sm bg-juice-orange-100 text-juice-orange-700 rounded">
                管理者
              </span>
            )}
          </dd>
        </div>
        <div className="py-3 flex justify-between items-start">
          <dt className="text-base text-gray-500 pt-0.5">メール</dt>
          <dd className="text-lg font-medium text-gray-900 text-right break-all max-w-[70%]">
            {user.email}
          </dd>
        </div>
      </dl>

      {/* アクションボタン */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          className="px-6 py-3 text-base font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2"
          onClick={() => alert("プロフィール編集機能は準備中です")}
          aria-label="プロフィールを編集"
        >
          編集
        </button>
      </div>
    </div>
  );
};

export default Profile;
