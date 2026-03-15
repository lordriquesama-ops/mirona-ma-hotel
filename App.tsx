
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Rooms from './components/Rooms';
import Bookings from './components/Bookings';
import Guests from './components/Guests';
import Login from './components/Login';
import AuditLogs from './components/AuditLogs';
import Finances from './components/Finances';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Staff from './components/Staff';
import Housekeeping from './components/Housekeeping';
import WebsiteCMS from './components/WebsiteCMS';
import PublicWebsite from './components/PublicWebsiteRefined';
import NotFound from './components/NotFound';
import SyncStatus from './components/SyncStatus';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { Role, User } from './types';
import { SearchIcon, MenuIcon, BuildingIcon, LogOutIcon, LockIcon, ExternalLinkIcon } from './components/Icons';
import { initDB, logAction, syncData, getSession, setSession } from './services/db';
import { NotificationProvider, NotificationDropdown } from './components/NotificationSystem';

// Separate component for public website to avoid hooks issues
const PublicWebsiteWrapper: React.FC = () => {
  return <PublicWebsite />;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(getSession());
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Safe initialization with error handling
    const initializeApp = async () => {
      try {
        // Try to initialize database (might fail with Supabase)
        await initDB();
        console.log('✅ Database initialized successfully');
      } catch (error) {
        console.warn('⚠️ Database initialization failed (expected with Supabase):', error);
      }

      // Initialize auto-sync between IndexedDB and Supabase
      try {
        const { initAutoSync } = await import('./services/sync-manager');
        initAutoSync();
        console.log('✅ Auto-sync initialized');
      } catch (error) {
        console.warn('⚠️ Auto-sync initialization failed:', error);
      }

      // Try background sync (might fail)
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-data');
          console.log('✅ Background sync registered');
        } catch (error) {
          console.warn('⚠️ Background sync failed (expected in development):', error);
        }
      }

      // App is ready
      setIsLoading(false);
    };

    // Force app to continue after 3 seconds even if initialization fails
    const timeout = setTimeout(() => {
      console.log('⏰ Forcing app to continue after timeout');
      setIsLoading(false);
    }, 3000);

    initializeApp();
    
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        syncData().catch(error => {
          console.warn('⚠️ Sync failed (expected with Supabase):', error);
        });
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setSession(user);
    // Redirect Marketing to their specific page by default
    if (user.role === 'MARKETING') setActivePage('website');
    else setActivePage('dashboard');
  };

  const handleLogout = async () => {
    if (currentUser) {
        await logAction(currentUser, 'LOGOUT', 'User logged out');
    }
    setCurrentUser(null);
    setSession(null);
    setActivePage('dashboard');
  };

  const renderContent = () => {
      if (!currentUser) return null;

      // Access Control
      const isReception = currentUser.role === 'RECEPTION';
      const isMarketing = currentUser.role === 'MARKETING';
      
      const restrictedForReception = ['finance', 'reports', 'settings', 'activity', 'staff', 'website'];
      const allowedForMarketing = ['website', 'website-preview', 'dashboard'];

      if (isReception && restrictedForReception.includes(activePage)) {
          return <AccessDenied page={activePage} />;
      }
      
      if (isMarketing && !allowedForMarketing.includes(activePage)) {
          return <AccessDenied page={activePage} />;
      }

      switch(activePage) {
          case 'dashboard':
              return <Dashboard role={currentUser.role} onNavigate={setActivePage} />;
          case 'rooms':
              return <Rooms user={currentUser} />;
          case 'housekeeping':
              return <Housekeeping user={currentUser} />;
          case 'bookings':
              return <Bookings user={currentUser} />;
          case 'guests':
              return <Guests user={currentUser} />;
          case 'staff':
              return <Staff user={currentUser} />;
          case 'activity':
              return <AuditLogs user={currentUser} />;
          case 'finance':
              return <Finances user={currentUser} />;
          case 'reports':
              return <Reports user={currentUser} />;
          case 'settings':
              return <Settings user={currentUser} />;
          case 'website':
              return <WebsiteCMS user={currentUser} onPreview={() => setActivePage('website-preview')} />;
          case 'website-preview':
              return (
                <div className="fixed inset-0 z-40 flex flex-col" style={{ top: '56px' }}>
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200 shrink-0">
                    <button onClick={() => setActivePage('website')} className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
                      ← Back to CMS
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Public Website Preview</span>
                  </div>
                  <iframe src="/website" className="w-full flex-1 border-0" title="Public Website Preview" />
                </div>
              );
          default:
              return (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fade-in">
                    <div className="bg-white p-8 rounded-full shadow-sm mb-4">
                        <BuildingIcon className="w-12 h-12 text-gray-300" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Page Under Construction</h2>
                    <p>The {activePage} module is coming soon.</p>
                </div>
              );
      }
  };

  const formattedDate = currentDate.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <>
      <SplashScreen />
      <Routes>
        {/* Public Website Route - No Authentication Required */}
        <Route path="/website" element={<PublicWebsiteWrapper />} />
        
        {/* Admin Dashboard Routes - Authentication Required */}
        <Route path="/*" element={
          isLoading ? (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
              <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Mirona Hotel...</h2>
              <p className="text-gray-500">Initializing your hotel management system</p>
            </div>
          ) : !currentUser ? (
            <Login onLogin={handleLogin} />
          ) : (
            <NotificationProvider user={currentUser}>
              <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 selection:bg-teal-100 print:h-auto print:overflow-visible">
                
                {sidebarOpen && (
                  <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
                    <div className="relative flex-1 w-64 max-w-xs bg-[#0d4a6b] shadow-xl transform transition-transform duration-300">
                      <Sidebar 
                          role={currentUser.role} 
                          activePage={activePage} 
                          setActivePage={(page) => {
                              setActivePage(page);
                              setSidebarOpen(false);
                          }} 
                      />
                      <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                    </div>
                  </div>
                )}

                <div className={`hidden lg:block shrink-0 h-full shadow-sm z-20 print:hidden transition-all duration-300 bg-[#0d4a6b] ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
                   <Sidebar 
                      role={currentUser.role} 
                      activePage={activePage} 
                      setActivePage={setActivePage} 
                      collapsed={sidebarCollapsed}
                      toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                   />
                </div>

                <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 print:h-auto print:overflow-visible">
                    <header className="bg-white border-b border-gray-200 h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 print:hidden">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                <MenuIcon className="w-5 h-5" />
                            </button>
                            <div className="hidden sm:block">
                                <h1 className="text-base font-bold text-gray-800 capitalize leading-tight">
                                    {activePage === 'dashboard' ? 'Overview' : activePage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h1>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{formattedDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <SyncStatus />
                            <NotificationDropdown />
                            <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
                                <div className="text-right hidden md:block">
                                    <div className="text-xs font-bold text-gray-800">{currentUser.name}</div>
                                    <div className="text-[10px] text-teal-600 font-bold uppercase tracking-tight">{currentUser.role}</div>
                                </div>
                                <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
                                    {currentUser.name.charAt(0)}
                                </div>
                                <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all" title="Sign Out">
                                    <LogOutIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth no-scrollbar print:overflow-visible print:h-auto">
                        <div className="w-full max-w-7xl mx-auto">
                            <ErrorBoundary>
                                {renderContent()}
                            </ErrorBoundary>
                        </div>
                    </main>
                </div>
              </div>
            </NotificationProvider>
          )
        } />
        
        {/* 404 Not Found Route - Catch All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const AccessDenied = ({ page }: { page: string }) => (
    <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fade-in">
        <div className="bg-red-50 p-8 rounded-full shadow-sm mb-4">
            <LockIcon className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Access Denied</h2>
        <p className="max-w-md text-center text-sm">You do not have permission to view the {page} module. Please contact an administrator.</p>
    </div>
);

export default App;
