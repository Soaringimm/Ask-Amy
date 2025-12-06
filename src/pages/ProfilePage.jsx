import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import { FaUserCircle, FaEnvelope, FaWeixin, FaIdCard } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, profile, updateProfile, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [wechatId, setWechatId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(''); // Future implementation for avatar upload
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setWechatId(profile.wechat_id || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('您未登录，无法更新资料。');
      setLoading(false);
      return;
    }

    try {
      const updates = {
        display_name: displayName,
        wechat_id: wechatId,
        avatar_url: avatarUrl, // Will be updated later with actual upload logic
        updated_at: new Date().toISOString(),
      };
      await updateProfile(updates);
      setSuccess('资料更新成功！');
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.message || '更新资料失败');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4 text-center">加载用户资料...</div>
      </MainLayout>
    );
  }

  if (!user || !profile) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4 text-center">请登录以查看您的资料。</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-8 max-w-2xl bg-white rounded-lg shadow-md mt-10">
        <div className="text-center mb-8">
          <FaUserCircle className="text-6xl text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">我的个人资料</h1>
          <p className="text-gray-600 mt-2">管理您的账户信息</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <FaEnvelope className="inline-block mr-2" />邮箱地址
            </label>
            <input
              type="email"
              id="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              <FaIdCard className="inline-block mr-2" />显示名称
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="您的显示名称"
            />
          </div>

          <div>
            <label htmlFor="wechatId" className="block text-sm font-medium text-gray-700 mb-2">
              <FaWeixin className="inline-block mr-2" />微信 ID
            </label>
            <input
              type="text"
              id="wechatId"
              value={wechatId}
              onChange={(e) => setWechatId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="您的微信ID"
            />
          </div>

          {/* Avatar upload would go here in a future iteration */}
          {/* <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-2">
              头像 URL
            </label>
            <input
              type="text"
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://example.com/avatar.jpg"
            />
          </div> */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400"
          >
            {loading ? '保存中...' : '保存更改'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
