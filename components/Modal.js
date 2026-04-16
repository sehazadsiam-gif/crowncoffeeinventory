'use client'
import { X, AlertCircle } from 'lucide-react'

export default function Modal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', type = 'danger' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 py-6 flex items-start gap-4">
          <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2 text-sm uppercase tracking-wider">
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm()
              onClose()
            }} 
            className={`${type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'} text-white px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
