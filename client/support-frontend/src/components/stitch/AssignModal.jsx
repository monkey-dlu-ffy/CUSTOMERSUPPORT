import React, { useState } from 'react';

const AssignModal = ({ isOpen, onClose, onAssign, ticket, agents }) => {
  const [selectedAgent, setSelectedAgent] = useState('');

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAgent) return;
    onAssign(ticket._id, selectedAgent);
    setSelectedAgent(''); // Reset for next time
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-outline-variant flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-lg border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-headline-sm text-on-surface">Assign Ticket</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-lg flex flex-col gap-md">
          <div>
            <p className="text-label-md text-on-surface-variant mb-xs">Ticket Details</p>
            <p className="font-title-md text-on-surface">#{ticket._id.substring(ticket._id.length - 8)} - {ticket.title}</p>
          </div>

          <div className="flex flex-col gap-xs mt-sm">
            <label className="font-label-md text-on-surface-variant">Select Agent</label>
            <select 
              value={selectedAgent} 
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-surface-container p-sm rounded-lg border border-outline-variant focus:border-primary outline-none cursor-pointer"
              required
            >
              <option value="" disabled>-- Choose an Agent --</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-md flex justify-end gap-sm mt-sm">
            <button type="button" onClick={onClose} className="px-lg py-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!selectedAgent}
              className="bg-primary text-on-primary px-lg py-sm rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignModal;