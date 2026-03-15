
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BellIcon, CheckIcon, AlertTriangleIcon, UserIcon, TrashIcon, XCircleIcon } from './Icons';
import { AppNotification, Role, User } from '../types';
import { addNotification, getNotifications, markNotificationRead, clearAllNotifications } from '../services/db';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  notify: (title: string, message: string, type?: AppNotification['type'], targetRoles?: Role[]) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface ProviderProps {
  children: ReactNode;
  user: User | null;
}

export const NotificationProvider: React.FC<ProviderProps> = ({ children, user }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (user) {
        loadNotifications();
        // Request browser permission for system notifications
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
  }, [user]);

  // Polling for updates (Simulate real-time) - in PWA context, Service Worker is better but this is simple
  useEffect(() => {
      if(!user) return;
      const interval = setInterval(loadNotifications, 30000); // Check every 30s
      return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async () => {
      const all = await getNotifications();
      // Filter for current user role
      const relevant = all.filter(n => !n.targetRoles || (user && n.targetRoles.includes(user.role)));
      // Sort desc
      const sorted = relevant.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(sorted);
  };

  const notify = async (title: string, message: string, type: AppNotification['type'] = 'info', targetRoles?: Role[]) => {
      const newNotif: AppNotification = {
          id: Date.now().toString() + Math.random().toString(),
          title,
          message,
          type,
          timestamp: new Date().toISOString(),
          read: false,
          targetRoles
      };

      // 1. Add to Local State (Immediate UI update)
      if (!targetRoles || (user && targetRoles.includes(user.role))) {
          setNotifications(prev => [newNotif, ...prev]);
          setToasts(prev => [...prev, newNotif]);
          
          // Auto remove toast
          setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== newNotif.id));
          }, 5000);

          // Browser Notification (If permitted and page hidden)
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              new window.Notification(title, { body: message, icon: '/icon-192x192.png' });
          }
      }

      // 2. Persist
      await addNotification(newNotif);
  };

  const markAsRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await markNotificationRead(id);
  };

  const clearAll = async () => {
      setNotifications([]);
      await clearAllNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, notify, markAsRead, clearAll }}>
      {children}
      
      {/* TOAST CONTAINER */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
              <div key={toast.id} className="pointer-events-auto bg-white rounded-lg shadow-lg border border-gray-100 p-3 w-72 animate-slide-up flex items-start gap-2.5 transform transition-all">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                      toast.type === 'success' ? 'bg-green-100 text-green-600' :
                      toast.type === 'error' ? 'bg-red-100 text-red-600' :
                      toast.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                  }`}>
                      {toast.type === 'success' ? <CheckIcon className="w-3.5 h-3.5" /> :
                       toast.type === 'error' ? <XCircleIcon className="w-3.5 h-3.5" /> :
                       <AlertTriangleIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                      <h4 className="text-[11px] font-bold text-gray-800">{toast.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{toast.message}</p>
                  </div>
                  <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              </div>
          ))}
      </div>
    </NotificationContext.Provider>
  );
};

// --- UI COMPONENT: BELL DROPDOWN ---
export const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-1.5 text-gray-400 hover:text-teal-600 transition-colors focus:outline-none"
            >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-sm animate-in zoom-in duration-300">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">Notifications</h3>
                            {notifications.length > 0 && (
                                <button onClick={clearAll} className="text-[9px] text-teal-600 hover:underline font-bold uppercase">Clear All</button>
                            )}
                        </div>
                        <div className="max-h-72 overflow-y-auto no-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-[10px] uppercase tracking-tight">No notifications yet</div>
                            ) : (
                                notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => markAsRead(notif.id)}
                                        className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer flex gap-2.5 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                        <div>
                                            <h4 className={`text-xs ${!notif.read ? 'font-bold text-gray-800' : 'font-medium text-gray-600'}`}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{notif.message}</p>
                                            <div className="text-[9px] text-gray-400 mt-1.5 font-medium">
                                                {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
