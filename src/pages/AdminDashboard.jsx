import { useState, useEffect } from 'react'
import { FaComments, FaSync } from 'react-icons/fa'
import { format } from 'date-fns'
import AdminLayout from '../layouts/AdminLayout'
import { getBookings } from '../lib/calcom'

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBookings()
      setBookings(data)
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('无法加载预约数据，请检查 Cal.com API 配置')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    const labels = {
      upcoming: '待进行',
      completed: '已完成',
      cancelled: '已取消',
      pending: '待确认',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaComments className="mr-3" /> 预约管理
          </h1>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <p className="text-gray-600 mb-8">查看和管理 Cal.com 预约记录。</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">暂无预约记录</p>
            <p className="text-gray-400 text-sm mt-2">预约将在用户通过 Cal.com 预约后显示</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {booking.attendees?.[0]?.name || '未知用户'}
                    </h3>
                    <p className="text-gray-600">{booking.attendees?.[0]?.email || '无邮箱'}</p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">预约时间</p>
                    <p className="text-gray-900 font-medium">
                      {booking.startTime ? format(new Date(booking.startTime), 'yyyy-MM-dd HH:mm') : '未知'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">预约类型</p>
                    <p className="text-gray-900 font-medium">
                      {booking.eventType?.title || booking.title || '咨询'}
                    </p>
                  </div>
                </div>

                {booking.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">备注</p>
                    <p className="text-gray-700">{booking.description}</p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  创建时间：{booking.createdAt ? format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm') : '未知'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
