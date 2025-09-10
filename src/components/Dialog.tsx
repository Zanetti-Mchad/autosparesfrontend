"use client";
import React from 'react';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
};

const Dialog: React.FC<DialogProps> = ({ open, onClose, children, maxWidthClassName = 'max-w-md' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className={`relative bg-white rounded-2xl p-6 w-full ${maxWidthClassName} shadow-xl`}>
        {children}
      </div>
    </div>
  );
};

export default Dialog;


