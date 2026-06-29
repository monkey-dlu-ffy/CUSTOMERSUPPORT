import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar({ role, userName, userEmail, onNewTicketClick, onLogout, activeLink = 'Ticket Queue' }) {
  
  const getQueueRoute = () => {
    if (role === 'Admin') return '/admin-control'; 
    if (role === 'Company_Owner') return '/owner-dashboard'; 
    if (role === 'Agent') return '/agent'; 
    return '/dashboard'; 
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'Admin': return 'Admin Control';
      case 'Company_Owner': return 'Company Owner';
      case 'Agent': return 'Agent Portal';
      default: return 'Customer Portal';
    }
  };

  // --- NEW: NOTIFICATION ENABLER ---
  // Browsers block notifications unless triggered by a physical user click.
  const enableNotifications = () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification("Success!", { 
          body: "Notifications are now enabled for your support desk." 
        });
      } else {
        alert("Notifications are blocked. Please check your browser's site settings (the lock icon in the URL bar).");
      }
    });
  };

  return (
    <aside className="fixed h-full w-64 left-0 top-0 bg-surface dark:bg-primary-container border-r border-outline-variant dark:border-outline flex flex-col p-md overflow-y-auto z-50">
      <div className="mb-xl px-sm">
        <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-on-primary-fixed mb-xs">My Customer Support</h1>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {getRoleTitle()}
        </p>
      </div>

      <nav className="flex-1 space-y-xs">
        {/* Ticket Queue / Main Workspace */}
        <Link 
          to={getQueueRoute()} 
          className={`flex items-center gap-md rounded-xl px-md py-sm active:scale-[0.98] transition-transform cursor-pointer ${
            (activeLink === 'Ticket Queue' || activeLink === 'Workspace' || activeLink === 'Team')
            ? 'bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary'
            : 'text-on-surface-variant dark:text-on-primary-container hover:bg-surface-container-high dark:hover:bg-primary-fixed-dim'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="list_alt">list_alt</span>
          <span className="font-body-md text-body-md">Ticket Queue</span>
        </Link>

        {/* Public Help Center - Visible to Everyone */}
        <Link 
          to="/help" 
          className={`flex items-center gap-md rounded-xl px-md py-sm active:scale-[0.98] transition-transform cursor-pointer mt-sm ${
            activeLink === 'Help Center'
            ? 'bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary'
            : 'text-on-surface-variant dark:text-on-primary-container hover:bg-surface-container-high dark:hover:bg-primary-fixed-dim'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="help_center">help_center</span>
          <span className="font-body-md text-body-md">Help Center</span>
        </Link>

        {/* Archive */}
        {(role === 'Customer' || role === 'Admin' || role === 'Agent' || role === 'Company_Owner') && (
          <Link 
            to="/archive" 
            className={`flex items-center gap-md rounded-xl px-md py-sm active:scale-[0.98] transition-transform cursor-pointer mt-sm ${
              activeLink === 'Previous Queries'
              ? 'bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary'
              : 'text-on-surface-variant dark:text-on-primary-container hover:bg-surface-container-high dark:hover:bg-primary-fixed-dim'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="history">history</span>
            <span className="font-body-md text-body-md">Previous Queries</span>
          </Link>
        )}

        {/* Knowledge Base / Articles */}
        {(role === 'Admin' || role === 'Company_Owner') && (
          <Link 
            to="/articles" 
            className={`flex items-center gap-md rounded-xl px-md py-sm active:scale-[0.98] transition-transform cursor-pointer mt-sm ${
              activeLink === 'Knowledge Base'
              ? 'bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary'
              : 'text-on-surface-variant dark:text-on-primary-container hover:bg-surface-container-high dark:hover:bg-primary-fixed-dim'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
            <span className="font-body-md text-body-md">Knowledge Base</span>
          </Link>
        )}
      </nav>

      {/* Conditional New Ticket Button */}
      {role === 'Customer' && (
        <button
          onClick={onNewTicketClick}
          className="mt-xl w-full bg-primary text-on-primary font-title-lg py-md rounded-xl flex items-center justify-center gap-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined" data-icon="add">add</span>
          <span>New Ticket</span>
        </button>
      )}

      {/* Settings / Support & Profile */}
      <div className="mt-auto pt-xl border-t border-outline-variant space-y-xs">
        
        {/* NEW: Force Notification Permissions Button */}
        <button
          onClick={enableNotifications}
          className="w-full flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high px-md py-sm rounded-xl text-left cursor-pointer"
        >
          <span className="material-symbols-outlined" data-icon="notifications">notifications_active</span>
          <span className="font-body-md">Enable Notifications</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high px-md py-sm rounded-xl text-left cursor-pointer"
        >
          <span className="material-symbols-outlined" data-icon="settings">logout</span>
          <span className="font-body-md">Sign Out</span>
        </button>

        <div className="flex items-center gap-md px-md py-md mt-sm bg-surface-container rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary flex-shrink-0 uppercase">
            {(role || 'U').charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="font-title-lg text-title-lg truncate" title={userName || 'User Profile'}>
              {role || 'User Profile'}
            </p>
            
            {/* NEW: Live Pulsing Dot */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate" title={userEmail || 'Online'}>
                Online
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </aside>
  );
}