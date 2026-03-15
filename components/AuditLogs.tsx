import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/db';
import { AuditLogEntry, User } from '../types';
import { ClipboardListIcon, UserIcon, SearchIcon, FilterIcon, SortIcon } from './Icons';

interface AuditLogsProps {
  user: User;
}

type SortDirection = 'asc' | 'desc';

const AuditLogs: React.FC<AuditLogsProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = filterUser === 'ALL' || log.userName === filterUser;
    const matchesRole = filterRole === 'ALL' || log.userRole === filterRole;
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && new Date(log.timestamp) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      // Set end date to end of day
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(log.timestamp) <= end;
    }
    
    return matchesSearch && matchesUser && matchesRole && matchesAction && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const uniqueUsers = Array.from(new Set(logs.map(l => l.userName))).sort();
  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort();

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardListIcon className="w-6 h-6 text-teal-600" />
            System Activity Log
          </h2>
          <p className="text-sm text-gray-500">Track all actions performed within the system for accountability.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm text-gray-600">
          Total Records: <strong>{sortedLogs.length}</strong>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search details or actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 appearance-none cursor-pointer"
            >
              <option value="ALL">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 appearance-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="RECEPTION">Reception</option>
              <option value="MARKETING">Marketing</option>
            </select>
          </div>

          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 appearance-none cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
            <input 
              type="date" 
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
            {(filterStartDate || filterEndDate) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="text-red-500 hover:text-red-700 ml-1"
                title="Clear Dates"
              >
                ✕
              </button>
            )}
          </div>

          <button 
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
          >
            <SortIcon className={`w-3.5 h-3.5 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            {sortDirection === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-gray-400">Loading activity history...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 font-mono whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{log.userName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                        log.userRole === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        log.userRole === 'MANAGER' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                        'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {log.userRole}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold ${
                        log.action === 'LOGIN' ? 'text-green-600' :
                        log.action === 'LOGOUT' ? 'text-gray-500' :
                        log.action.includes('CREATE') ? 'text-blue-600' :
                        'text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
                {sortedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No activity recorded yet or no matches for filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;