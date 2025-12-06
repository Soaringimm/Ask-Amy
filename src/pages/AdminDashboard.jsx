import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FaComments } from 'react-icons/fa';
import { format } from 'date-fns';
import AdminLayout from '../layouts/AdminLayout'; // Import the new AdminLayout

export default function AdminDashboard() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        return;
      }
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConsultations(data || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConsultation = async (id, updates) => {
    try {
      if (!supabase) {
        throw new Error('数据库未配置');
      }
      const { error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      fetchConsultations(); // Re-fetch consultations to update the list
      setSelectedConsultation(null); // Close the modal
    } catch (error) {
      console.error('Error updating consultation:', error);
      alert('更新失败');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      pending: '待报价',
      quoted: '已报价',
      paid: '已支付',
      completed: '已完成',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <AdminLayout> {/* Use AdminLayout for overall structure */}
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <FaComments className="mr-3" /> 咨询管理
        </h1>
        <p className="text-gray-600 mb-8">管理用户提交的咨询请求。</p>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : consultations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">暂无咨询记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {consultation.name}
                    </h3>
                    <p className="text-gray-600">{consultation.email}</p>
                  </div>
                  {getStatusBadge(consultation.status)}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">问题描述：</p>
                  <p className="text-gray-700">{consultation.question}</p>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>期望完成：{consultation.deadline}</span>
                  <span>提交时间：{format(new Date(consultation.created_at), 'yyyy-MM-dd HH:mm')}</span>
                </div>

                {consultation.quote && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">报价信息：</p>
                    <p className="text-blue-800">{consultation.quote}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedConsultation(consultation)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                  >
                    {consultation.status === 'pending' ? '添加报价' : '更新状态'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 更新咨询弹窗 */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedConsultation.status === 'pending' ? '添加报价' : '更新咨询状态'}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleUpdateConsultation(selectedConsultation.id, {
                  quote: formData.get('quote'),
                  status: formData.get('status'),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  报价信息
                </label>
                <textarea
                  name="quote"
                  rows="3"
                  defaultValue={selectedConsultation.quote || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="例如：书面回复 - $50 CAD / 电话咨询（约30分钟）- $150 CAD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状态
                </label>
                <select
                  name="status"
                  defaultValue={selectedConsultation.status}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">待报价</option>
                  <option value="quoted">已报价</option>
                  <option value="paid">已支付</option>
                  <option value="completed">已完成</option>
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
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