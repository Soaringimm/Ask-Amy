import { Component } from 'react'

/**
 * Error boundary for the MeetPage.
 * Catches any uncaught render/hook errors so the page shows a friendly
 * message instead of a blank white screen that silently drops the call.
 */
export default class MeetErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'Unknown error' }
  }

  componentDidCatch(err, info) {
    console.error('[MeetErrorBoundary] Caught error:', err, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold mb-3">会议页面发生错误</h2>
            <p className="text-gray-400 text-sm mb-6">{this.state.message}</p>
            <button
              onClick={() => window.location.href = '/meet'}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
            >
              返回会议大厅
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
