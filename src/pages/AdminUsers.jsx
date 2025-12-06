import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../layouts/AdminLayout'; // Using the new AdminLayout
import { useAuth } from '../contexts/AuthContext';
import { FaUsers, FaEnvelope, FaIdCard, FaWeixin, FaUserCog } from 'react-icons/fa';

export default function AdminUsers() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && profile?.role === 'admin') {
      fetchUsers();
    } else if (!authLoading && profile?.role !== 'admin') {
      setError('您没有权限访问此页面。');
      setLoading(false);
    }
  }, [authLoading, profile]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, wechat_id, role, created_at');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || '加载用户列表失败。');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <AdminLayout><div className="p-4 text-center">加载用户数据...</div></AdminLayout>;
  }

  if (error) {
    return <AdminLayout><div className="p-4 text-red-700 text-center">{error}</div></AdminLayout>;
  }

  return (
    <AdminLayout> {/* Use AdminLayout for overall structure */}
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <FaUsers className="mr-3" /> 用户管理
        </h1>
        <p className="text-gray-600 mb-8">查看和管理注册用户。</p>

        {users.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>目前没有注册用户。</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FaEnvelope className="inline-block mr-1" />邮箱
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FaIdCard className="inline-block mr-1" />显示名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FaWeixin className="inline-block mr-1" />微信ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FaUserCog className="inline-block mr-1" />角色
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册日期
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.display_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.wechat_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}