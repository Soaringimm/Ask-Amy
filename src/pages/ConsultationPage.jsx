import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { FaCheckCircle } from 'react-icons/fa'

export default function ConsultationPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    question: '',
    deadline: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 检查 Supabase 是否已配置
      if (!supabase) {
        throw new Error('数据库未配置，请联系管理员')
      }

      const { error } = await supabase
        .from('consultations')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            question: formData.question,
            deadline: formData.deadline,
            status: 'pending',
          },
        ])

      if (error) throw error

      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        question: '',
        deadline: '',
      })
    } catch (error) {
      console.error('Error submitting consultation:', error)
      setError(error.message || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            提交成功！
          </h2>
          <p className="text-gray-600 mb-6">
            我们已收到您的咨询请求。我们会在24小时内审阅您的问题，并通过邮件发送报价。
          </p>
          <p className="text-gray-600 mb-8">
            报价将包含咨询类型（书面回复或电话咨询）和费用，您可以根据报价决定是否继续。
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition"
          >
            提交另一个咨询
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          个性化咨询
        </h1>
        <p className="text-gray-600">
          提交您的问题，我们将为您提供专业的个性化解答
        </p>
      </div>

      {/* 服务说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">咨询流程：</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>填写下方表单，详细描述您的问题</li>
          <li>我们会在24小时内审阅并通过邮件发送报价</li>
          <li>报价示例：书面回复 - $50 CAD / 电话咨询（约30分钟）- $150 CAD</li>
          <li>您确认并支付后，我们将按时完成咨询</li>
        </ol>
      </div>

      {/* 咨询表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* 姓名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              您的姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入您的姓名"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              电子邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="your@email.com"
            />
            <p className="text-sm text-gray-500 mt-1">
              我们将通过此邮箱向您发送报价和咨询结果
            </p>
          </div>

          {/* 问题描述 */}
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              问题描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="question"
              name="question"
              required
              rows="6"
              value={formData.question}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请详细描述您的问题，提供的信息越详细，我们的解答就越准确..."
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
              期望完成时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              required
              value={formData.deadline}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              我们会尽力在您期望的时间前完成咨询
            </p>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400"
          >
            {loading ? '提交中...' : '提交咨询请求'}
          </button>
        </div>
      </form>
    </div>
  )
}
