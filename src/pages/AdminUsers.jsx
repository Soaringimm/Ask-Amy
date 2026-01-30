import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  FaUsers,
  FaSearch,
  FaSpinner,
  FaUserShield,
  FaUser,
  FaBan,
  FaCheck,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import AdminLayout from '../layouts/AdminLayout'

const ITEMS_PER_PAGE = 10

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [roleModalUser, setRoleModalUser] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    active: 0,
    todayNew: 0,
  })

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [currentPage, sortField, sortOrder, filterRole, filterStatus, searchQuery])

  const fetchStats = async () => {
    try {
      // Total users
      const { count: total } = await supabase
        .from('aa_profiles')
        .select('*', { count: 'exact', head: true })

      // Admin count (admin + superuser)
      const { count: admins } = await supabase
        .from('aa_profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'superuser'])

      // Active users
      const { count: active } = await supabase
        .from('aa_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Today new users
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: todayNew } = await supabase
        .from('aa_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      setStats({
        total: total || 0,
        admins: admins || 0,
        active: active || 0,
        todayNew: todayNew || 0,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('aa_profiles')
        .select('*', { count: 'exact' })

      // Apply search
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      }

      // Apply role filter
      if (filterRole !== 'all') {
        query = query.eq('role', filterRole)
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('is_active', filterStatus === 'active')
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setUsers(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const handleChangeRole = async (userId, newRole) => {
    setActionLoading(userId)
    setRoleModalUser(null)

    try {
      const { error } = await supabase
        .from('aa_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      fetchStats()
    } catch (err) {
      console.error('Error updating role:', err)
      alert('更新角色失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (userId, isActive) => {
    setActionLoading(userId)

    try {
      const { error } = await supabase
        .from('aa_profiles')
        .update({ is_active: !isActive })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !isActive } : u))
      fetchStats()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('更新状态失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定要删除此用户吗？此操作不可恢复。')) return

    setActionLoading(userId)

    try {
      const { error } = await supabase
        .from('aa_profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setUsers(users.filter(u => u.id !== userId))
      setTotalCount(prev => prev - 1)
      fetchStats()
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('删除用户失败')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />
    return sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaUsers className="text-2xl text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">总用户数</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">管理员</p>
            <p className="text-2xl font-bold text-primary-600">{stats.admins}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">活跃用户</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">今日新增</p>
            <p className="text-2xl font-bold text-blue-600">{stats.todayNew}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索邮箱或昵称..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">所有角色</option>
              <option value="superuser">超级用户</option>
              <option value="admin">管理员</option>
              <option value="client">普通用户</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">所有状态</option>
              <option value="active">活跃</option>
              <option value="inactive">已禁用</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="animate-spin text-3xl text-primary-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无用户数据</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center gap-1">
                          角色
                          <SortIcon field="role" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-1">
                          注册时间
                          <SortIcon field="created_at" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('last_login_at')}
                      >
                        <div className="flex items-center gap-1">
                          最后登录
                          <SortIcon field="last_login_at" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <FaUser className="text-primary-600" />
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.display_name || '未设置昵称'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'superuser'
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role === 'superuser' ? (
                              <>
                                <FaUserShield className="w-3 h-3" />
                                超级用户
                              </>
                            ) : user.role === 'admin' ? (
                              <>
                                <FaUserShield className="w-3 h-3" />
                                管理员
                              </>
                            ) : (
                              <>
                                <FaUser className="w-3 h-3" />
                                普通用户
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.is_active !== false
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.is_active !== false ? (
                              <>
                                <FaCheck className="w-3 h-3" />
                                活跃
                              </>
                            ) : (
                              <>
                                <FaBan className="w-3 h-3" />
                                已禁用
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.created_at
                            ? format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at
                            ? format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm')
                            : '从未登录'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {actionLoading === user.id ? (
                              <FaSpinner className="animate-spin text-gray-400" />
                            ) : (
                              <>
                                <button
                                  onClick={() => setRoleModalUser(user)}
                                  className="text-primary-600 hover:text-primary-700"
                                  title="修改角色"
                                >
                                  <FaUserShield />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user.id, user.is_active !== false)}
                                  className={user.is_active !== false ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                                  title={user.is_active !== false ? '禁用账户' : '启用账户'}
                                >
                                  {user.is_active !== false ? <FaBan /> : <FaCheck />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="删除用户"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} 共 {totalCount} 条
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Role Change Modal */}
        {roleModalUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold mb-4">修改用户角色</h3>
              <p className="text-sm text-gray-600 mb-4">
                用户: {roleModalUser.display_name || roleModalUser.email}
              </p>
              <div className="space-y-2">
                {[
                  { value: 'client', label: '普通用户', desc: '只能访问公开内容' },
                  { value: 'admin', label: '管理员', desc: '可以管理内容和用户' },
                  { value: 'superuser', label: '超级用户', desc: '拥有所有权限' },
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => handleChangeRole(roleModalUser.id, role.value)}
                    disabled={actionLoading === roleModalUser.id}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                      roleModalUser.role === role.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{role.label}</div>
                    <div className="text-xs text-gray-500">{role.desc}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
