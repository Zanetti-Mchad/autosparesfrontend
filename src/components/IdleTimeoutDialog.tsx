"use client";

import { LogOut } from "lucide-react";

type IdleTimeoutDialogProps = {
  isOpen: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onCancel: () => void;
};

export default function IdleTimeoutDialog({
  isOpen,
  remainingSeconds,
  onContinue,
  onCancel,
}: IdleTimeoutDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Still there?
          </h3>
          <p className="text-gray-600 mb-2">
            You will be signed out due to inactivity.
          </p>
          <p className="text-3xl font-bold text-amber-600 mb-6 tabular-nums">
            {remainingSeconds}s
          </p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-gray-800 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
