
import React from 'react';
import { LogoIcon, DashboardIcon, BuildingIcon, UserIcon, MoneyIcon, CalendarIcon, SettingsIcon, TicketIcon, ClipboardListIcon, FileTextIcon, UserGroupIcon, BroomIcon, LayoutIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { Role } from '../types';

interface SidebarProps {
  role: Role;
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed?: boolean;
  toggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activePage, setActivePage, collapsed = false, toggleCollapse }) => {
  const menuGroups = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', label: 'Overview', icon: DashboardIcon, roles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
        { id: 'bookings', label: 'Bookings', icon: CalendarIcon, roles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
        { id: 'rooms', label: 'Rooms & Layout', icon: BuildingIcon, roles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
        { id: 'housekeeping', label: 'Housekeeping', icon: BroomIcon, roles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
      ]
    },
    {
      title: 'People',
      items: [
        { id: 'guests', label: 'Guest Directory', icon: UserGroupIcon, roles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
        { id: 'staff', label: 'Staff Mgmt', icon: UserIcon, roles: ['ADMIN', 'MANAGER'] },
      ]
    },
    {
      title: 'Publicity',
      items: [
        { id: 'website', label: 'Website CMS', icon: LayoutIcon, roles: ['ADMIN', 'MARKETING'] },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'finance', label: 'Financials', icon: MoneyIcon, roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports', label: 'System Reports', icon: FileTextIcon, roles: ['ADMIN', 'MANAGER'] },
        { id: 'activity', label: 'Activity Logs', icon: ClipboardListIcon, roles: ['ADMIN', 'MANAGER'] },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['ADMIN'] },
      ]
    }
  ];

  return (
    <div className={`h-full w-full bg-[#0d4a6b] flex flex-col relative transition-all duration-300 ${collapsed ? 'items-center' : ''}`}>
      
      {/* Brand Section */}
      <div className={`pt-4 pb-4 flex items-center shrink-0 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-5 gap-3'}`}>
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm relative z-10">
          <LogoIcon className="w-5 h-5" />
        </div>
        
        <div className={`flex flex-col transition-all duration-300 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="text-white text-base font-bold tracking-tight whitespace-nowrap">MIRONA MA</span>
            <span className="text-teal-200 text-[8px] uppercase tracking-widest whitespace-nowrap opacity-70">Management System</span>
        </div>
      </div>

      {toggleCollapse && (
        <button 
            onClick={toggleCollapse}
            className="absolute -right-3 top-6 z-50 w-6 h-6 bg-white text-teal-700 rounded-full flex items-center justify-center shadow-sm hover:bg-teal-50 transition-all border border-gray-200"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {collapsed ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronLeftIcon className="w-3 h-3" />}
        </button>
      )}

      <nav className={`flex-1 w-full space-y-3 overflow-y-auto no-scrollbar py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {menuGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIndex} className="flex flex-col">
              <div className={`mb-1.5 text-[9px] font-bold uppercase tracking-widest text-teal-200/40 whitespace-nowrap transition-all duration-300 ${collapsed ? 'text-center opacity-0 h-0 overflow-hidden' : 'px-3 opacity-100 h-auto'}`}>
                  {group.title}
              </div>
              
              {collapsed && groupIndex > 0 && <div className="h-px bg-teal-800/20 w-6 mx-auto mb-2"></div>}

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      title={collapsed ? item.label : ''}
                      className={`flex items-center rounded-lg transition-all duration-150 group relative
                        ${collapsed 
                            ? 'justify-center w-9 h-9 mx-auto' 
                            : 'w-full gap-3 px-3 py-2'
                        }
                        ${isActive ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/5' : 'text-teal-100/70 hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-teal-300' : 'text-teal-200/50 group-hover:text-teal-100'}`} />
                      
                      <span className={`font-medium text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        {item.label}
                      </span>
                      
                      {!collapsed && isActive && (
                          <div className="absolute right-2 w-1 h-1 rounded-full bg-teal-400"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={`w-full shrink-0 border-t border-teal-800/20 p-3 transition-all duration-300 ${collapsed ? 'px-2' : 'px-4'}`}>
         <button className={`flex items-center text-teal-200/70 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition-all group ${collapsed ? 'justify-center w-full' : 'gap-2 w-full px-1.5'}`} title={collapsed ? `User: ${role}` : ''}>
            <div className={`w-7 h-7 rounded-lg bg-teal-800 border border-teal-700 flex items-center justify-center group-hover:bg-teal-700 transition-colors shrink-0 shadow-sm text-[10px] font-bold text-white relative`}>
                 {role.charAt(0)}
                 <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-[#0d4a6b] rounded-full"></div>
            </div>
            
            <div className={`flex flex-col items-start overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <span className="text-[10px] font-bold whitespace-nowrap text-white">System User</span>
                <span className="text-[8px] uppercase opacity-50 truncate w-20 text-left tracking-tighter">{role}</span>
            </div>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
