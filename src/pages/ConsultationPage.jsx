import Cal, { getCalApi } from '@calcom/embed-react'
import { useEffect } from 'react'
import { getCalUsername } from '../lib/calcom'

export default function ConsultationPage() {
  const calUsername = getCalUsername()

  useEffect(() => {
    (async function () {
      const cal = await getCalApi()
      cal('ui', {
        theme: 'light',
        styles: { branding: { brandColor: '#2563eb' } },
        hideEventTypeDetails: false,
      })
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          预约咨询
        </h1>
        <p className="text-gray-600">
          选择您方便的时间，预约专业咨询服务
        </p>
      </div>

      {/* 服务说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">咨询流程：</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>在下方日历中选择可用时间段</li>
          <li>填写您的基本信息和咨询问题</li>
          <li>确认预约后，您将收到确认邮件</li>
          <li>咨询结束后通过微信/支付宝完成付款</li>
        </ol>
      </div>

      {/* Cal.com 嵌入 */}
      {calUsername ? (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <Cal
            calLink={calUsername}
            style={{ width: '100%', height: '100%', overflow: 'scroll' }}
            config={{ layout: 'month_view' }}
          />
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            预约系统配置中，请稍后再试或直接联系我们。
          </p>
        </div>
      )}

      {/* 付款说明 */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">付款方式：</h3>
        <p className="text-gray-600">
          咨询完成后，我们将通过邮件发送付款二维码（支持微信/支付宝）。
        </p>
      </div>
    </div>
  )
}
