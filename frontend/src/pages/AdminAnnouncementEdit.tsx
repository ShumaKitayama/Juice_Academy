import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import SuccessAlert from "../components/SuccessAlert";
import { useAuth } from "../hooks/useAuth";
import {
  Announcement,
  deleteAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
} from "../services/announcementService";

type ActionType = "update" | "delete" | null;

const AdminAnnouncementEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [completedAction, setCompletedAction] = useState<ActionType>(null);

  useEffect(() => {
    // 管理者権限チェック
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }

    const fetchAnnouncement = async () => {
      if (!id) {
        setError("お知らせIDが不正です");
        setLoading(false);
        return;
      }

      try {
        const data = await getAnnouncementById(id);
        setAnnouncement(data);
        setTitle(data.title);
        setContent(data.content);
        setLoading(false);
      } catch (err) {
        console.error("お知らせの取得に失敗しました", err);
        setError("お知らせの取得に失敗しました");
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // 入力チェック
    if (!title.trim()) {
      setError("タイトルを入力してください");
      setSubmitting(false);
      return;
    }

    if (!content.trim()) {
      setError("内容を入力してください");
      setSubmitting(false);
      return;
    }

    try {
      // トークンが自動的に使用されるようになったため、このチェックは不要になりました
      // ただし、ログイン状態のチェックとして残しておくこともできます
      if (!localStorage.getItem("accessToken")) {
        throw new Error("認証情報が見つかりません");
      }

      if (!id) {
        throw new Error("お知らせIDが不正です");
      }

      await updateAnnouncement(id, { title, content });
      setSuccess(true);
      setCompletedAction("update");
      setSubmitting(false);

      // 3秒後に一覧ページへリダイレクト
      setTimeout(() => {
        navigate("/admin/announcements");
      }, 3000);
    } catch (err) {
      console.error("お知らせの更新に失敗しました", err);
      setError("お知らせの更新に失敗しました");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // トークンが自動的に使用されるようになったため、このチェックは不要になりました
      // ただし、ログイン状態のチェックとして残しておくこともできます
      if (!localStorage.getItem("accessToken")) {
        throw new Error("認証情報が見つかりません");
      }

      if (!id) {
        throw new Error("お知らせIDが不正です");
      }

      await deleteAnnouncement(id);
      setSuccess(true);
      setCompletedAction("delete");
      setSubmitting(false);

      // 3秒後に一覧ページへリダイレクト
      setTimeout(() => {
        navigate("/admin/announcements");
      }, 3000);
    } catch (err) {
      console.error("お知らせの削除に失敗しました", err);
      setError("お知らせの削除に失敗しました");
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/announcements");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <ErrorAlert message={error} />
          <div className="mt-6 text-center">
            <Button onClick={handleCancel} variant="outline" size="medium">
              戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">お知らせを編集</h1>
          <div className="flex space-x-3">
            {!showDeleteConfirm && !success && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="danger"
                size="small"
                disabled={submitting}
              >
                削除
              </Button>
            )}
            <Button
              onClick={handleCancel}
              variant="outline"
              size="small"
              disabled={submitting}
            >
              キャンセル
            </Button>
          </div>
        </div>

        {error && <ErrorAlert message={error} className="mb-4" />}
        {success && (
          <SuccessAlert
            title="成功"
            message={
              completedAction === "update"
                ? "お知らせを更新しました。リダイレクトします..."
                : "お知らせを削除しました。リダイレクトします..."
            }
            className="mb-4"
          />
        )}

        {showDeleteConfirm && !success ? (
          <div className="bg-red-50 border border-red-100 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">
              お知らせを削除しますか？
            </h2>
            <p className="text-red-700 mb-4">この操作は取り消せません。</p>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                size="medium"
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                size="medium"
                isLoading={submitting}
                disabled={submitting}
              >
                削除する
              </Button>
            </div>
          </div>
        ) : null}

        {!success && (
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
                  disabled={submitting || showDeleteConfirm}
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
                  disabled={submitting || showDeleteConfirm}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="medium"
                  type="button"
                  disabled={submitting || showDeleteConfirm}
                >
                  キャンセル
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  type="submit"
                  isLoading={submitting && completedAction !== "delete"}
                  disabled={submitting || showDeleteConfirm}
                >
                  更新する
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncementEdit;
