import React from 'react';

export default function Header({ role, searchQuery, onSearchChange }) {
  const getRoleBadgeStyles = () => {
    switch (role) {
      case 'Admin':
        return 'bg-error-container text-on-error-container border border-error/20';
      case 'Agent':
        return 'bg-surface-container-highest text-secondary font-bold border border-secondary/20';
      default:
        return 'bg-surface-container-high text-on-surface-variant border border-outline-variant';
    }
  };

  return (
    <header className="flex justify-between items-center h-16 px-gutter sticky top-0 bg-surface dark:bg-primary border-b border-outline-variant dark:border-outline z-40">
      <div className="flex items-center gap-xl flex-1">
        <h2 className="font-title-lg text-title-lg text-on-surface dark:text-on-primary-fixed whitespace-nowrap">
          Support Dashboard
        </h2>

        <div className="max-w-md w-full relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none z-10"
            data-icon="search"
          >
            search
          </span>

          <input
            type="text"
            placeholder="Search tickets by title, description, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-full pl-12 pr-4 py-2 font-label-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-md">
        <span
          className={`px-md py-xs rounded-full text-label-sm font-bold uppercase tracking-wider ${getRoleBadgeStyles()}`}
        >
          {role || 'Customer'}
        </span>
      </div>
    </header>
  );
}