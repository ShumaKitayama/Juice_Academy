import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createAnnouncement } from '../services/announcementService';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import SuccessAlert from '../components/SuccessAlert';

const AdminAnnouncementCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 管理者権限チェック
    if (!user || user.role !== 'admin') {
      console.error('管理者権限が必要です。現在のユーザー:', user);
      navigate('/');
      return;
    }

    // ログイン状態とトークンの確認
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('認証トークンが見つかりません');
      navigate('/login');
      return;
    }

    console.log('管理者としてログイン中:', user);
    console.log('認証トークン (抜粋):', token.substring(0, 20) + '...');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // デバッグ情報を出力
    console.log('現在のユーザー情報:', user);
    console.log('認証トークン存在確認:', !!localStorage.getItem('token'));

    // 入力チェック
    if (!title.trim()) {
      setError('タイトルを入力してください');
      setLoading(false);
      return;
    }

    if (!content.trim()) {
      setError('内容を入力してください');
      setLoading(false);
      return;
    }

    try {
      // 認証情報の再確認
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証情報が見つかりません');
      }

      // デバッグ用：トークンの表示
      console.log('認証トークン (最初の20文字):', token.substring(0, 20) + '...');

      // 明示的なログをさらに追加
      console.log('お知らせ作成処理を開始します');

      try {
        await createAnnouncement({ title, content });
        console.log('お知らせ作成成功');
        setSuccess(true);
        setLoading(false);

        // 3秒後に一覧ページへリダイレクト
        setTimeout(() => {
          navigate('/admin/announcements');
        }, 3000);
      } catch (apiError: any) {
        console.error('API呼び出し中のエラー:', apiError);
        console.error('エラーレスポンス:', apiError.response?.data);
        throw apiError;
      }
    } catch (err: any) {
      console.error('お知らせの作成に失敗しました', err);
      // より詳細なエラーメッセージを表示
      setError(err.response?.data?.error || 'お知らせの作成に失敗しました');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/announcements');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">新しいお知らせを作成</h1>
          <Button
            onClick={handleCancel}
            variant="outline"
            size="small"
          >
            キャンセル
          </Button>
        </div>

        {error && <ErrorAlert message={error} className="mb-4" />}
        {success && <SuccessAlert title="成功" message="お知らせを作成しました。リダイレクトします..." className="mb-4" />}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
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