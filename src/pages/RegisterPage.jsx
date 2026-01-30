import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return '密码长度至少8个字符'
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return '密码必须包含字母'
    }
    if (!/[0-9]/.test(pwd)) {
      return '密码必须包含数字'
    }
    return null
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate display name
    if (!displayName.trim()) {
      setError('请输入昵称')
      return
    }

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Check password match
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, displayName)
      navigate('/')
    } catch (err) {
      console.error('Registration error:', err)
      if (err.message.includes('already registered')) {
        setError('该邮箱已被注册')
      } else {
        setError(err.message || '注册失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  // Password strength indicators
  const passwordChecks = [
    { label: '至少8个字符', check: password.length >= 8 },
    { label: '包含字母', check: /[a-zA-Z]/.test(password) },
    { label: '包含数字', check: /[0-9]/.test(password) },
  ]

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-primary-400/30 rounded-full blur-2xl" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-8">
              <HiSparkles className="text-white" />
              <span className="text-sm font-medium text-white/90">加入我们的社区</span>
            </div>

            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              开启您的
              <br />
              <span className="text-accent-300">移民咨询之旅</span>
            </h2>

            <ul className="space-y-4 text-white/90">
              {['免费浏览 IRCC 官方问答', '收藏感兴趣的文章', '预约专业咨询服务'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <FaCheckCircle className="text-white text-xs" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white relative z-10">
        <div className="max-w-md w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow duration-300">
              <HiSparkles className="text-white text-xl" />
            </div>
            <span className="font-display text-2xl font-bold gradient-text">
              Ask Amy
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-primary-950 mb-2">
              创建账户
            </h1>
            <p className="text-gray-600">
              加入 Ask Amy 社区，获取专业移民资讯
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                昵称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="您的昵称"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="创建密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {/* Password strength indicators */}
              {password && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {passwordChecks.map((item, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                        item.check
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <FaCheckCircle className={item.check ? 'text-green-500' : 'text-gray-400'} />
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 group"
            >
              {loading ? (
                '注册中...'
              ) : (
                <>
                  创建账户
                  <FaArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            已有账户？{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold link-underline">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
