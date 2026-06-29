// src/utils/themeUtils.js

export const getPriorityStyle = (priority) => {
  switch (priority) {
    case 'Urgent':
      return 'bg-error text-white font-black animate-pulse';
    case 'High':
      return 'bg-red-500 text-white font-bold';
    case 'Low':
      return 'bg-secondary-fixed-dim text-on-secondary-fixed';
    default:
      return 'bg-tertiary-fixed text-on-tertiary-fixed';
  }
};

export const getStatusStyle = (status) => {
  switch (status) {
    case 'Open':
      return 'bg-error-container text-on-error-container';
    case 'Resolved':
      return 'bg-secondary-container text-on-secondary-container';
    case 'Closed':
      return 'bg-surface-container-high text-on-surface-variant';
    default: // In Progress
      return 'bg-surface-container-highest text-secondary';
  }
};