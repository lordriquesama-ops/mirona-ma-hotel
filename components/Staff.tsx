
import React, { useState, useEffect } from 'react';
import { User, Role, Shift } from '../types';
import { getUsers, getAuditLogs, getShifts, saveShift, logAction } from '../services/db';
import { UserGroupIcon, ClockIcon, BriefcaseIcon, StarIcon, CheckIcon, SearchIcon, SortIcon, UserIcon, EyeIcon, EyeOffIcon } from './Icons';

interface StaffProps {
    user?: User;
}

type SortKey = 'name' | 'role' | 'activity';

const Staff: React.FC<StaffProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'directory' | 'roster'>('directory');
    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{[key: string]: number}>({});
    
    // Filtering & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'activity', direction: 'desc' });
    const [revealedPasswords, setRevealedPasswords] = useState<{[key: string]: boolean}>({});

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedLogs, fetchedShifts] = await Promise.all([
                getUsers(),
                getAuditLogs(),
                getShifts()
            ]);
            setUsers(fetchedUsers);
            setShifts(fetchedShifts);

            // Calculate Activity Score based on audit logs
            const activityCounts: {[key: string]: number} = {};
            fetchedLogs.forEach(log => {
                activityCounts[log.userId] = (activityCounts[log.userId] || 0) + 1;
            });
            setStats(activityCounts);

        } catch (err) {
            console.error("Failed to load staff data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftChange = async (userId: string, day: string, type: Shift['type']) => {
        const existingShift = shifts.find(s => s.userId === userId && s.day === day);
        const newShift: Shift = {
            id: existingShift ? existingShift.id : Date.now().toString() + Math.random().toString().slice(2,6),
            userId,
            day: day as any,
            type
        };

        // Optimistic UI Update
        const updatedShifts = existingShift 
            ? shifts.map(s => s.id === existingShift.id ? newShift : s)
            : [...shifts, newShift];
        
        setShifts(updatedShifts);

        try {
            await saveShift(newShift);
        } catch (err) {
            console.error("Failed to save shift", err);
        }
    };

    const getShiftColor = (type: string) => {
        switch(type) {
            case 'Morning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Afternoon': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Night': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Off': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-white border-dashed border-gray-300 text-gray-400';
        }
    };

    // Sorting Logic
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedUsers = users
        .filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof User];
            let bVal: any = b[sortConfig.key as keyof User];

            // Special case for activity score which isn't on the user object directly
            if (sortConfig.key === 'activity') {
                aVal = stats[a.id] || 0;
                bVal = stats[b.id] || 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const SortIndicator = ({ active }: { active: boolean }) => {
        if (!active) return <SortIcon className="w-3 h-3 text-gray-300 opacity-50" />;
        return <SortIcon className={`w-3 h-3 text-teal-600 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />;
    };

    const togglePasswordVisibility = (staffId: string) => {
        setRevealedPasswords(prev => ({
            ...prev,
            [staffId]: !prev[staffId]
        }));
    };

    // Summary Stats
    const totalStaff = users.length;
    const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').length;
    const topPerformer = users.reduce((prev, current) => ((stats[prev.id] || 0) > (stats[current.id] || 0)) ? prev : current, users[0]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading staff data...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BriefcaseIcon className="w-6 h-6 text-teal-600" />
                        Staff Management
                    </h2>
                    <p className="text-sm text-gray-500">Manage team roster, schedules and monitor performance</p>
                </div>

                <div className="flex gap-4">
                     <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <UserGroupIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Total Staff</div>
                            <div className="text-lg font-bold text-gray-800 leading-none">{totalStaff}</div>
                        </div>
                    </div>
                    {topPerformer && (
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hidden md:flex">
                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                                <StarIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Top Performer</div>
                                <div className="text-sm font-bold text-gray-800 leading-none">{topPerformer.name}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'directory' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <UserIcon className="w-4 h-4" /> Directory
                    </button>
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'roster' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <ClockIcon className="w-4 h-4" /> Weekly Roster
                    </button>
                </div>
                
                {/* Search Bar (Only visible in directory) */}
                {activeTab === 'directory' && (
                    <div className="relative w-64 hidden sm:block">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search staff..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                    </div>
                )}
            </div>

            {/* DIRECTORY VIEW (Table) */}
            {activeTab === 'directory' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group">
                                        <div className="flex items-center gap-1">Staff Member <SortIndicator active={sortConfig.key === 'name'} /></div>
                                    </th>
                                    <th onClick={() => handleSort('role')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group">
                                        <div className="flex items-center gap-1">Role <SortIndicator active={sortConfig.key === 'role'} /></div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                                    <th onClick={() => handleSort('activity')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group">
                                        <div className="flex items-center gap-1">Activity Score <SortIndicator active={sortConfig.key === 'activity'} /></div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {processedUsers.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full ${staff.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm border border-white ring-1 ring-gray-100`}>
                                                    {staff.name.charAt(0)}
                                                </div>
                                                <div className="font-bold text-gray-800 text-sm">{staff.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                                staff.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                staff.role === 'MANAGER' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                                                'bg-orange-50 text-orange-700 border-orange-100'
                                            }`}>
                                                {staff.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">
                                            @{staff.username}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-yellow-400 rounded-full" 
                                                        style={{ width: `${Math.min(100, (stats[staff.id] || 0) * 2)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 w-8 text-right">{stats[staff.id] || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {processedUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400">
                                            No staff found matching "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROSTER VIEW */}
            {activeTab === 'roster' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 text-sm uppercase">Weekly Shift Schedule</h3>
                        <div className="flex gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Morning</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Afternoon</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Night</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 bg-gray-50/50 sticky left-0 z-10 w-48 shadow-[1px_0_0_rgba(0,0,0,0.05)]">Staff Member</th>
                                    {DAYS.map(day => (
                                        <th key={day} className="p-4 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 text-center min-w-[120px]">
                                            {day.substring(0,3)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(staff => (
                                    <tr key={staff.id} className="hover:bg-gray-50/30">
                                        <td className="p-4 sticky left-0 bg-white z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] border-r border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full ${staff.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                                                    {staff.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 text-sm">{staff.name}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">{staff.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {DAYS.map(day => {
                                            const currentShift = shifts.find(s => s.userId === staff.id && s.day === day);
                                            const shiftType = currentShift ? currentShift.type : '';
                                            
                                            return (
                                                <td key={day} className="p-2 border-l border-gray-50">
                                                    <select
                                                        value={shiftType}
                                                        onChange={(e) => handleShiftChange(staff.id, day, e.target.value as any)}
                                                        className={`w-full p-2 rounded-lg text-xs font-bold appearance-none cursor-pointer outline-none border focus:ring-2 focus:ring-teal-500 transition-colors ${getShiftColor(shiftType)}`}
                                                    >
                                                        <option value="">- Select -</option>
                                                        <option value="Morning">Morning</option>
                                                        <option value="Afternoon">Afternoon</option>
                                                        <option value="Night">Night</option>
                                                        <option value="Off">Off Duty</option>
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;
