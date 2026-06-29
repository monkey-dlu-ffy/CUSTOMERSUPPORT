import React from 'react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, role }) {
  if (!isOpen) return null;

  const isAdmin = role === 'Admin';

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-gutter">
      <div 
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md shadow-2xl p-gutter space-y-md animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-sm text-error">
          <span className="material-symbols-outlined text-[32px]">warning</span>
          <h3 className="font-title-lg text-title-lg font-bold text-error">
            {isAdmin ? 'OVERRIDE: Confirm Global Purge' : 'Confirm Ticket Purge'}
          </h3>
        </div>

        <p className="font-body-md text-on-surface-variant leading-relaxed">
          {isAdmin 
            ? 'You are executing an Admin-level database override. This record will be permanently wiped from the entire multi-tenant system.'
            : 'Are you absolutely sure you want to permanently delete this ticket? This action cannot be undone and will be permanently removed from the cluster database.'
          }
        </p>

        <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
          <button 
            onClick={onClose} 
            className="border border-outline-variant hover:bg-surface-container px-md py-sm rounded-xl font-label-md transition-colors cursor-pointer"
          >
            {isAdmin ? 'Abort' : 'Cancel'}
          </button>
          <button 
            onClick={onConfirm} 
            className="bg-error text-on-error px-md py-sm rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            {isAdmin ? 'Execute Purge' : 'Confirm Purge'}
          </button>
        </div>
      </div>
    </div>
  );
}
