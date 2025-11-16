import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";
import { useAuth } from "../hooks/useAuth";
import { createAnnouncement } from "../services/announcementService";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const AdminAnnouncementCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 管理者権限チェック
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }

    // ログイン状態とトークンの確認
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 入力チェック
    if (!title.trim()) {
      setError("タイトルを入力してください");
      setLoading(false);
      return;
    }

    if (!content.trim()) {
      setError("内容を入力してください");
      setLoading(false);
      return;
    }

    try {
      // 認証情報の再確認
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("認証情報が見つかりません");
      }

      await createAnnouncement({ title, content });
      setSuccess(true);
      setLoading(false);

      // 3秒後に一覧ページへリダイレクト
      setTimeout(() => {
        navigate("/admin/announcements");
      }, 3000);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.error || "お知らせの作成に失敗しました"
      );
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/announcements");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            新しいお知らせを作成
          </h1>
          <Button onClick={handleCancel} variant="outline" size="small">
            キャンセル
          </Button>
        </div>

        {error && <ErrorAlert message={error} className="mb-4" />}
        {success && (
          <SuccessAlert
            title="成功"
            message="お知らせを作成しました。リダイレクトします..."
            className="mb-4"
          />
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                タイトル
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="お知らせのタイトルを入力"
                disabled={loading || success}
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                内容
              </label>
              <textarea
                id="content"
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="お知らせの内容を入力してください"
                disabled={loading || success}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="medium"
                type="button"
                disabled={loading || success}
              >
                キャンセル
              </Button>
              <Button
                variant="primary"
                size="medium"
                type="submit"
                isLoading={loading}
                disabled={loading || success}
              >
                作成する
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementCreate;
