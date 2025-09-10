import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';

interface DialogBoxProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'warning' | 'info';
}

const DialogBox: React.FC<DialogBoxProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'delete'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-lg">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onCancel}
        >
          <XCircle size={20} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
          <AlertTriangle 
            className={`h-6 w-6 ${type === 'delete' ? 'text-red-600' : type === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} 
          />
        </div>

        {/* Title */}
        <h3 className="mb-3 text-lg font-medium text-center text-gray-900">
          {title}
        </h3>

        {/* Message */}
        <p className="mb-6 text-sm text-center text-gray-500">{message}</p>

        {/* Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              type === 'delete' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;