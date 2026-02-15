import { FaTimes } from 'react-icons/fa'

/**
 * Reusable styled confirmation dialog to replace native confirm().
 */
export default function ConfirmDialog({ open, title, message, confirmText = '确定', cancelText = '取消', danger = false, onConfirm, onCancel, icon }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {icon && (
            <div className={`p-3 rounded-full ${danger ? 'bg-red-100' : 'bg-primary-100'}`}>
              {icon}
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-3 text-white rounded-xl transition-colors font-medium shadow-lg ${
              danger
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
