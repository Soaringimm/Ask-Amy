import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEnvelope, FaCheck } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message || '发送重置邮件失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheck className="text-green-600 text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">邮件已发送</h1>
            <p className="text-gray-600 mb-6">
              我们已向 <span className="font-medium">{email}</span> 发送了密码重置链接。
              请查看您的邮箱并点击链接重置密码。
            </p>
            <p className="text-sm text-gray-500 mb-6">
              如果没有收到邮件，请检查垃圾邮件文件夹。
            </p>
            <Link
              to="/login"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              返回登录
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <FaEnvelope className="text-5xl text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">忘记密码</h1>
          <p className="text-gray-600 mt-2">输入您的邮箱，我们将发送重置链接</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400"
            >
              {loading ? '发送中...' : '发送重置链接'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            想起密码了？{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              返回登录
            </Link>
          </div>
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
