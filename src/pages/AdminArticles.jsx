import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../layouts/AdminLayout'; // Using the new AdminLayout
import { FaPlus, FaEdit, FaTrash, FaBook } from 'react-icons/fa';

export default function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleForm, setArticleForm] = useState({ id: null, title: '', content: '' });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError(err.message || '加载文章失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateArticle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        throw new Error('数据库未配置');
      }

      if (articleForm.id) { // Update existing article
        const { error } = await supabase
          .from('articles')
          .update({ title: articleForm.title, content: articleForm.content })
          .eq('id', articleForm.id);
        if (error) throw error;
      } else { // Create new article
        const { error } = await supabase
          .from('articles')
          .insert([articleForm]);
        if (error) throw error;
      }
      setShowArticleModal(false);
      setArticleForm({ id: null, title: '', content: '' });
      fetchArticles();
    } catch (err) {
      console.error('Error creating/updating article:', err);
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditArticle = (article) => {
    setArticleForm({ id: article.id, title: article.title, content: article.content });
    setShowArticleModal(true);
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return;

    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        throw new Error('数据库未配置');
      }
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      setError(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AdminLayout><div className="p-4 text-center">加载文章数据...</div></AdminLayout>;
  }

  if (error) {
    return <AdminLayout><div className="p-4 text-red-700 text-center">{error}</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <FaBook className="mr-3" /> 知识库管理
        </h1>
        <p className="text-gray-600 mb-8">管理平台上的知识库文章。</p>

        <div className="mb-6">
          <button
            onClick={() => {
              setArticleForm({ id: null, title: '', content: '' }); // Reset form for new article
              setShowArticleModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center"
          >
            <FaPlus className="mr-2" />
            添加新文章
          </button>
        </div>

        {articles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">暂无文章</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2">
                      {article.content?.substring(0, 200)}...
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEditArticle(article)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 文章编辑/创建弹窗 */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {articleForm.id ? '编辑文章' : '添加新文章'}
            </h3>

            <form onSubmit={handleCreateOrUpdateArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题
                </label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="输入文章标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                <textarea
                  required
                  rows="10"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="输入文章内容"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  {articleForm.id ? '保存更改' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowArticleModal(false);
                    setArticleForm({ id: null, title: '', content: '' }); // Reset form
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
