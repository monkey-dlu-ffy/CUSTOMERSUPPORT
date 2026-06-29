import React from 'react';

export default function TicketModal({ isOpen, onClose, onSubmit, newTicket, setNewTicket, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-gutter">
      <div 
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary px-gutter py-md text-on-primary flex justify-between items-center">
          <h3 className="font-title-lg text-title-lg font-bold">Log New Customer Complaint</h3>
          <button 
            onClick={onClose} 
            className="text-on-primary-container hover:text-on-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={onSubmit} className="p-gutter space-y-md">
          {error && (
            <div className="bg-error-container text-on-error-container p-md rounded-xl text-body-md border border-error/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-md">
            <div>
              <label className="block font-label-md text-on-surface-variant mb-xs">Incident Summary / Title</label>
              <input 
                type="text" 
                value={newTicket.title} 
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm font-body-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all" 
                placeholder="Brief summary of the application issue..."
                required
              />
            </div>
            
            <div>
              <label className="block font-label-md text-on-surface-variant mb-xs">Urgency / Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm font-body-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block font-label-md text-on-surface-variant mb-xs">Full Description of Problem</label>
            <textarea 
              value={newTicket.description} 
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm font-body-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all h-32 resize-none"
              placeholder="Provide exact logs, unexpected errors, or environment states context..."
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
            <button 
              type="button"
              onClick={onClose} 
              className="border border-outline-variant hover:bg-surface-container px-md py-sm rounded-xl font-label-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-secondary text-on-secondary px-gutter py-sm rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Initialize Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
